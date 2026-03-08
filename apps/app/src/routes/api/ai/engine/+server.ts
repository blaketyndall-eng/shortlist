import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { createServerSupabase } from '$services/supabase.server';
import type { AIModel, EngineName, EngineDepth, PipelineStage } from '@shortlist/shared-types/ai';

// Model selection by depth
const MODEL_MAP: Record<EngineDepth, string> = {
	quick: 'claude-haiku-4-5-20251001',
	standard: 'claude-sonnet-4-6',
	deep: 'claude-opus-4-6',
};

// Credit cost per model
const CREDIT_MAP: Record<string, number> = {
	'claude-haiku-4-5-20251001': 1,
	'claude-sonnet-4-6': 5,
	'claude-opus-4-6': 20,
};

// Max tokens per engine type (matching prototype allocations)
const TOKEN_LIMITS: Partial<Record<string, number>> = {
	category_detect: 300,
	vendor_suggest: 900,
	challenges: 600,
	vendor_research: 500,
	score_prefill: 400,
	demo_questions: 600,
	demo_debrief: 600,
	score_anomaly: 600,
	negotiation_coach: 700,
	hidden_cost_spotter: 600,
	risk_register: 700,
	contract_risk: 700,
	score_explanation: 2000,
	executive_brief: 800,
	decision_readiness: 700,
	company_autofill: 1200,
	compliance_suggest: 400,
	priorities_suggest: 300,
	stack_suggest: 300,
	context_notes: 500,
	reference_questions: 500,
	// SCOPE engines
	scope_cause_analyze: 800,
	scope_options_recommend: 1200,
	scope_readiness_assess: 900,
	scope_brief_generate: 1500,
	scope_import: 600,
};

// Model overrides for specific engines (prototype uses specific model per engine)
const ENGINE_MODEL_OVERRIDE: Partial<Record<string, string>> = {
	category_detect: 'claude-haiku-4-5-20251001',
	challenges: 'claude-haiku-4-5-20251001',
	vendor_research: 'claude-haiku-4-5-20251001',
	score_prefill: 'claude-haiku-4-5-20251001',
	compliance_suggest: 'claude-haiku-4-5-20251001',
	priorities_suggest: 'claude-haiku-4-5-20251001',
	stack_suggest: 'claude-haiku-4-5-20251001',
	demo_questions: 'claude-haiku-4-5-20251001',
	reference_questions: 'claude-haiku-4-5-20251001',
	score_explanation: 'claude-opus-4-6',
	executive_brief: 'claude-opus-4-6',
	// SCOPE engines
	scope_cause_analyze: 'claude-haiku-4-5-20251001',
	scope_options_recommend: 'claude-sonnet-4-6',
	scope_readiness_assess: 'claude-haiku-4-5-20251001',
	scope_brief_generate: 'claude-sonnet-4-6',
	scope_import: 'claude-haiku-4-5-20251001',
};

interface EngineRequest {
	engine: string;
	depth: EngineDepth;
	context: Record<string, unknown>;
	projectId?: string;
	scopeId?: string;
	task?: string;
}

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	if (!env.ANTHROPIC_API_KEY) {
		error(500, 'AI service not configured');
	}

	const body: EngineRequest = await request.json();

	if (!body.engine || (!body.projectId && !body.scopeId)) {
		error(400, 'Missing required fields: engine, projectId (or scopeId)');
	}

	// SCOPE engines run pre-project — use scopeId for tracking, allow null projectId
	const SCOPE_ENGINES = new Set([
		'scope_cause_analyze', 'scope_options_recommend',
		'scope_readiness_assess', 'scope_brief_generate', 'scope_import'
	]);
	const isScopeEngine = SCOPE_ENGINES.has(body.engine);
	const trackingId = body.projectId || body.scopeId;

	const depth = body.depth ?? 'standard';
	const model = ENGINE_MODEL_OVERRIDE[body.engine] ?? MODEL_MAP[depth] ?? MODEL_MAP.standard;
	const maxTokens = TOKEN_LIMITS[body.engine] ?? (depth === 'quick' ? 1024 : 4096);
	const startTime = Date.now();

	try {
		const systemPrompt = buildSystemPrompt(body.engine, body.context);
		const userPrompt = buildUserPrompt(body.engine, body.context);

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': env.ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model,
				max_tokens: maxTokens,
				system: systemPrompt,
				messages: [{ role: 'user', content: userPrompt }],
			}),
		});

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			error(502, `AI provider error: ${err.error?.message ?? response.statusText}`);
		}

		const aiResult = await response.json();
		const latency = Date.now() - startTime;
		const inputTokens = aiResult.usage?.input_tokens ?? 0;
		const outputTokens = aiResult.usage?.output_tokens ?? 0;
		const credits = CREDIT_MAP[model] ?? 5;

		// Track usage (SCOPE engines use scopeId when no projectId)
		const supabase = createServerSupabase(cookies);
		if (!isScopeEngine || body.projectId) {
			await supabase.from('ai_usage').insert({
				user_id: locals.user.id,
				project_id: body.projectId || null,
				engine: body.engine,
				model,
				input_tokens: inputTokens,
				output_tokens: outputTokens,
				credits_used: credits,
				latency_ms: latency,
			}).then(() => {});
		}

		// Parse the AI response
		let parsedResult: unknown;
		try {
			const text = aiResult.content?.[0]?.text ?? '';
			const cleaned = text.replace(/```json\n?|```/g, '').trim();
			parsedResult = JSON.parse(cleaned);
		} catch {
			parsedResult = { text: aiResult.content?.[0]?.text ?? '' };
		}

		return json({
			engine: body.engine,
			stage: 'recommend' as PipelineStage,
			data: parsedResult,
			result: parsedResult,
			model: model as AIModel,
			confidence: estimateConfidence(depth, aiResult),
			tokensUsed: { input: inputTokens, output: outputTokens },
		});
	} catch (err: any) {
		if (err.status) throw err;
		error(500, `AI engine error: ${err.message}`);
	}
};

// ============================================================
// SYSTEM PROMPTS - Matching prototype exactly
// ============================================================

function buildSystemPrompt(engine: string, context: Record<string, unknown>): string {
	// Inject company context if available
	const companyContext = buildCompanyContext(context.companyProfile as Record<string, unknown> | undefined);

	const prompts: Record<string, string> = {
		// --- SOLVE Phase ---
		category_detect: 'You are a software procurement expert. Respond ONLY with valid JSON, no markdown.',
		vendor_suggest: 'You are a B2B software procurement advisor. Return ONLY valid JSON, no markdown.',
		challenges: 'You are a procurement consultant. Respond ONLY with a JSON array, no markdown.',
		vendor_research: 'You are a B2B software analyst. Return ONLY valid JSON, no markdown.',

		// --- Evaluate Phase ---
		evaluate: 'You are Shortlist AI, a procurement intelligence assistant specializing in vendor evaluation: scoring, comparison, and analysis. Always respond with structured, actionable insights.',
		score_prefill: 'You are a B2B software analyst. Return ONLY valid JSON, no markdown.',
		score_anomaly: 'You are a procurement analyst. Return ONLY valid JSON.',
		score_explanation: 'You are a procurement analyst writing score justifications. Return ONLY valid JSON.',
		negotiation_coach: 'You are a seasoned B2B software negotiation expert. Return ONLY valid JSON.',
		hidden_cost_spotter: 'You are a software procurement cost expert. Return ONLY valid JSON.',
		risk_register: 'You are a procurement risk analyst. Return ONLY valid JSON.',
		contract_risk: 'You are a software contract expert. Return ONLY valid JSON.',
		executive_brief: 'You are a senior management consultant writing an executive decision memo. Write in clear, confident prose. No bullet points.',
		decision_readiness: 'You are a decision quality facilitator using structured decision-making. Return ONLY valid JSON.',

		// --- Demo Phase ---
		demo_briefing: 'You are a B2B procurement expert helping prepare for a vendor demo. Return ONLY valid JSON.',
		demo_debrief: 'You are a procurement facilitator synthesizing demo feedback. Return ONLY valid JSON.',
		demo_questions: 'You are a B2B procurement expert. Generate targeted vendor-specific demo questions. Return ONLY valid JSON.',
		reference_questions: 'You are an experienced procurement reference checker. Return ONLY valid JSON.',

		// --- Company Profile ---
		company_autofill: 'You are a procurement intelligence assistant. Analyse a company description and return a structured JSON profile. Only choose values from the provided option lists. Return ONLY valid JSON, no markdown.',
		compliance_suggest: 'You are a compliance expert. Return ONLY a JSON array of strings, no markdown.',
		priorities_suggest: 'You are a procurement strategist. Return ONLY a JSON array of strings, no markdown.',
		stack_suggest: 'You are a solutions architect. Return ONLY a comma-separated list of tool names, no markdown or explanation.',
		context_notes: 'You are a procurement intelligence assistant writing buyer context notes. Write in second person, clear and direct. 3–5 sentences max.',

		// --- Discovery & RFP ---
		discovery: 'You are Shortlist AI, specializing in vendor discovery: identifying, researching, and recommending vendors for specific use cases.',
		rfp: 'You are Shortlist AI, specializing in RFP generation: creating evaluation questionnaires, requirement documents, and scoring rubrics.',

		// --- Implementation ---
		implement: 'You are Shortlist AI, specializing in implementation planning: timelines, change management, and vendor onboarding.',

		// --- SCOPE Phase (pre-purchase diagnostic) ---
		scope_cause_analyze: 'You are a senior management consultant specializing in root cause analysis for business problems. Return ONLY valid JSON, no markdown.',
		scope_options_recommend: 'You are a strategic procurement advisor. Evaluate whether the team should Buy, Build, Fix, Partner, or Do Nothing. Return ONLY valid JSON, no markdown.',
		scope_readiness_assess: 'You are a procurement readiness assessor. Evaluate organizational readiness for a proposed approach. Return ONLY valid JSON, no markdown.',
		scope_brief_generate: 'You are an executive communication specialist writing decision briefs for leadership. Return ONLY valid JSON, no markdown.',
		scope_import: 'You are a procurement data mapping specialist. Map SCOPE diagnostic data to SOLVE project fields. Return ONLY valid JSON, no markdown.',
	};

	const basePrompt = prompts[engine] ?? prompts.evaluate;
	return companyContext ? `${basePrompt}\n\n${companyContext}` : basePrompt;
}

// ============================================================
// USER PROMPTS - Full templates from prototype
// ============================================================

function buildUserPrompt(engine: string, ctx: Record<string, unknown>): string {
	switch (engine) {
		case 'category_detect':
			return `Identify the software category for this problem. Return JSON:
{"category":"crm|hris|project|finance|marketing|support|data|devtools|collab|security|ecommerce|ops|other","label":"Full Category Name","icon":"emoji","confidence":0-100,"why":"one sentence","alternatives":[{"category":"id","label":"name","icon":"emoji"}]}

Problem: ${str(ctx.text).slice(0, 400)}`;

		case 'vendor_suggest':
			return `Recommend the best vendors for this buyer. Use everything below to pick options that genuinely fit.

Category: ${str(ctx.category)}
Approach: ${str(ctx.approach)}
Problem: ${str(ctx.problem)}
Cost of inaction: ${str(ctx.costOfInaction)}
Success in 90 days: ${str(ctx.successKPI)}
Replacing / existing: ${str(ctx.existingTool) || 'nothing'}
Annual budget: ${str(ctx.budget)}
Team size: ${str(ctx.teamSize)}

Return a JSON array of 5-7 vendor objects (include "Status Quo / Do Nothing" as last item):
[{"name":"Vendor Name","tagline":"one-line description","bestFor":"ideal for","tier":"smb|enterprise|free","features":["strength1","strength2","strength3"],"flags":["risk1","risk2"],"migrationRisk":"one sentence","peerBadge":"market position","whyThisBuyer":"why this fits"}]

Rank by fit for THIS buyer. Exclude vendors that clearly don't match budget or team size.`;

		case 'challenges':
			return `Generate 4 devil's advocate challenges for this software decision. Return JSON array of {"severity":"high|medium|low","icon":"emoji","title":"short title","question":"the challenge question","context":"1-sentence peer insight"}

Problem: ${str(ctx.problem)}
Approach: ${str(ctx.approach)}
Replacing: ${str(ctx.existingTool) || 'nothing'}
Category: ${str(ctx.category)}
Team size: ${str(ctx.teamSize)}
Annual budget: ${str(ctx.budget)}`;

		case 'vendor_research':
			return `Research "${str(ctx.vendorName)}" for a ${str(ctx.category)} evaluation. Return JSON:
{"overview":"2-sentence summary","typicalPricing":"pricing model and range","knownStrengths":["s1","s2","s3"],"knownWeaknesses":["w1","w2"],"implementationComplexity":"low|medium|high","implementationNote":"one sentence","g2Position":"brief positioning","watchOutFor":"top contract gotcha","competitors":["c1","c2"]}`;

		case 'score_prefill':
			return `Based on this vendor profile, suggest scores (1-10) for each evaluation criterion. Be honest and differentiated — don't give everything a 7. Use the full range.

Vendor: ${str(ctx.vendorName)}
Overview: ${str(ctx.overview)}
Strengths: ${arr(ctx.strengths).join('; ')}
Weaknesses / concerns: ${arr(ctx.concerns).join('; ')}
Implementation: ${str(ctx.implementationNote) || 'unknown'}

Criteria to score: ${arr(ctx.criteria).join(', ')}

Return JSON: {"scores":{"criterion name":score_integer},"reasoning":"one sentence summary"}`;

		case 'score_anomaly':
			return `Review these vendor evaluation scores for internal inconsistencies or red flags. Look for: high scores despite failed/disputed claims, suspiciously uniform scores, missing data on highly-scored criteria.

Evaluation context: ${str(ctx.evaluationName)}
Criteria: ${str(ctx.criteriaDescription)}

Vendor scores:
${str(ctx.scoreSummary)}

Return JSON array of anomalies (empty array if none):
[{"vendor":"name","criterion":"criterion or null","severity":"high|medium|low","flag":"one sentence describing the anomaly","suggestion":"one sentence on what to do"}]`;

		case 'negotiation_coach':
			return `Coach me on negotiating with "${str(ctx.vendor)}" for ${str(ctx.category) || 'software'}.

Problem context: ${str(ctx.problem)}
Team size: ${str(ctx.teamSize)}
Budget: ${str(ctx.budget)}
Year 1 quoted cost: ${str(ctx.year1Cost)}

Negotiation log so far:
${str(ctx.negotiationLog)}

Return JSON:
{"overallAssessment":"2-sentence read on negotiation","benchmarkInsight":"what deals like this typically achieve","counterAsks":["ask1","ask2","ask3"],"redFlags":["warning1"],"walkAwaySignal":"when to walk away","nextMove":"best next move"}`;

		case 'hidden_cost_spotter':
			return `Identify hidden costs and pricing traps for "${str(ctx.vendor)}" in the ${str(ctx.category) || 'software'} category.

Context:
- Problem: ${str(ctx.problem)}
- Team size: ${str(ctx.teamSize)}
- Quoted year 1: ${str(ctx.year1Cost)}
- Budget: ${str(ctx.budget)}
- License: ${str(ctx.license)}, Impl: ${str(ctx.impl)}, Training: ${str(ctx.training)}

Return JSON:
{"hiddenCosts":[{"category":"name","risk":"what could cost more","typicalOverrun":"e.g. 2-3x","priority":"high|medium|low"}],"negotiableItems":["item often free/discounted"],"totalRiskAddition":"rough extra cost estimate","topAdvice":"most important financial advice"}`;

		case 'risk_register':
			return `Identify narrative risks from the evaluation data below. Focus on qualitative signals — things people said, patterns in feedback, red flags in negotiation.

Demo feedback: ${str(ctx.feedbackSummary)}
Negotiation notes: ${str(ctx.negotiationNotes)}
Materials logged: ${str(ctx.materialNotes)}
Context: ${str(ctx.evaluationContext)}

Return JSON array of qualitative risks (max 5):
[{"vendor":"vendor name or null","severity":"high|medium|low","title":"short risk title","detail":"2-sentence detail","action":"recommended mitigation"}]`;

		case 'contract_risk':
			return `Review this software evaluation for contract risks. The team is evaluating: ${str(ctx.category) || 'software'} for ${str(ctx.problem) || 'their business'}.

Materials logged: ${str(ctx.materials)}
Vendor claims logged: ${str(ctx.claimsContext)}
Budget range: ${str(ctx.budget)}
Vendors: ${str(ctx.vendors)}

Identify the top contract and commercial risks they should negotiate. Return JSON:
{"criticalClauses":[{"clause":"clause name","risk":"what could go wrong","action":"what to negotiate","urgency":"must|should|nice"}],"vendorSpecific":[{"vendor":"name","risk":"specific risk"}],"topPriority":"single most important contract point"}`;

		case 'score_explanation':
			return `Generate 2-sentence justifications for each vendor's score on each criterion. Be specific and reference any claims or profile data.

Criteria: ${str(ctx.criteriaNames)}
Scores (0-10 scale):
${str(ctx.scoreData)}

Return JSON:
{"explanations":{"VendorName":{"CriterionName":"2-sentence explanation referencing specific evidence"}}}`;

		case 'executive_brief': {
			const winner = ctx.winner as Record<string, unknown> | undefined;
			const runner = ctx.runner as Record<string, unknown> | undefined;
			return `Write the recommendation narrative for an executive brief. This will go to the CFO and exec team.

Problem being solved: ${str(ctx.problem)}
Success criteria: ${str(ctx.success)}
Budget: ${str(ctx.budget)}
Decision deadline: ${str(ctx.deadline)}
Team size: ${str(ctx.teamSize)}

Vendor rankings (out of 100):
${str(ctx.vendorRankings)}

Winner profile: ${JSON.stringify(winner ?? {})}
Runner-up profile: ${JSON.stringify(runner ?? {})}

Write 3 paragraphs:
1. Why we recommend ${str(winner?.name)} — specific reasons tied to the problem and scoring
2. What we considered — acknowledge runner-up, key trade-offs, TCO/commercial factors
3. Risk acknowledgement — disputed claims, reference concerns, negotiation items; include mitigation

Be direct, specific, and CFO-ready. If TCO data is present, cite 3-year figures. Max 280 words total.`;
		}

		case 'decision_readiness': {
			const topVendors = arr(ctx.topVendors);
			return `Generate a 5-question decision readiness interview to pressure-test this procurement decision before committing.

Evaluation: ${str(ctx.evaluationName)}
Leading vendor: ${str(topVendors[0]?.name)} (${str(topVendors[0]?.score)}/100)
Runner-up: ${str(topVendors[1]?.name)} (${str(topVendors[1]?.score)}/100)
Number of vendors evaluated: ${str(ctx.vendorCount)}
Key criteria: ${str(ctx.keyCriteria)}
Team size: ${str(ctx.evaluatorCount)} evaluators

Generate 5 Socratic questions that surface blind spots, groupthink, or gaps. Mix types: pre-mortem, perspective-taking, assumption-testing, minority view surfacing, and reversibility.

Return JSON:
{"questions":[{"type":"pre-mortem|perspective|assumption|minority|reversibility","question":"the question","why":"why this matters for this decision"}]}`;
		}

		case 'demo_questions':
			return `Generate 6 targeted demo questions for evaluating "${str(ctx.vendorName)}".

Problem: ${str(ctx.problem)}
Criteria: ${arr(ctx.criteria).join(', ')}
${ctx.vendorOverview ? `Vendor overview: ${str(ctx.vendorOverview)}` : ''}
${arr(ctx.concerns).length ? `Known concerns: ${arr(ctx.concerns).join(', ')}` : ''}

Return JSON array:
[{"text":"question to ask","crit":"related criterion","why":"brief rationale"}]

Make questions specific to this vendor. Focus on validating strengths, probing concerns, testing criteria, uncovering limitations, understanding implementation reality.`;

		case 'reference_questions':
			return `Generate 5 targeted reference check questions for "${str(ctx.vendorName)}" in the ${str(ctx.category)} category.

Problem: ${str(ctx.problem)}
Key criteria: ${str(ctx.criteria)}
Known concerns: ${str(ctx.concerns)}

Return JSON array:
[{"question":"the reference check question","area":"implementation|support|value|risk|culture","why":"why this matters"}]`;

		case 'company_autofill':
			return `Company description: "${str(ctx.description)}"

Return JSON with these exact keys (use null for unknown):
{"name":"company name or null","industry":"one of: Technology, Healthcare, Financial Services, Manufacturing, Retail, Education, Government, Non-profit, Professional Services, Media, Energy, Real Estate, Other","size":"one of: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+","budget":"one of: Under $10k, $10k-$50k, $50k-$100k, $100k-$500k, $500k-$1M, $1M+","maturity":"one of: Ad-hoc, Developing, Established, Optimised","compliance":["from: SOC 2 Type II, ISO 27001, GDPR, HIPAA, FedRAMP, PCI-DSS, CCPA, NIST 800-53, FINRA, None required"],"priorities":["top 3-4 from: Cost reduction, Security first, Fast deployment, Ease of adoption, Deep integrations, Vendor consolidation, Scalability, Data sovereignty, Open-source preferred, Local support"],"vendorPref":["from: Enterprise tier, Mid-market, SMB-friendly, Open-source, Best of breed, Suite/platform"],"process":"one of: Individual, Committee, Formal RFP, Board approval","regions":["from: North America, Europe, APAC, LATAM, Middle East, Africa, Global"],"stack":"comma-separated tools or null","notes":"2-3 sentence procurement context"}`;

		case 'compliance_suggest':
			return `Based on this company profile: "${str(ctx.profileDesc)}"

Which compliance frameworks are most likely required or strongly recommended?
Choose from: SOC 2 Type II, ISO 27001, GDPR, HIPAA, FedRAMP, PCI-DSS, CCPA, NIST 800-53, FINRA, None required.
Return JSON array of 2-5 most applicable: ["SOC 2 Type II", ...]`;

		case 'priorities_suggest':
			return `Based on this company profile: "${str(ctx.profileDesc)}"

Which buying priorities are most important when evaluating software?
Choose from: Cost reduction, Security first, Fast deployment, Ease of adoption, Deep integrations, Vendor consolidation, Scalability, Data sovereignty, Open-source preferred, Local support.
Return JSON array of top 3-4: ["Security first", ...]`;

		case 'stack_suggest':
			return `Based on this company profile: "${str(ctx.profileDesc)}"
${ctx.existingStack ? `They already use: ${str(ctx.existingStack)}` : ''}

List 6-10 common tools this type of company typically runs — CRM, ERP, HRIS, project management, communication, cloud infrastructure, BI, etc.
Return only tool names separated by commas: Salesforce, Slack, Jira, AWS, ...`;

		case 'context_notes':
			return `Based on this company profile:
${str(ctx.fullProfile)}

Write a concise context note (3-5 sentences) that an AI assistant should know when helping this company evaluate and buy software. Cover: key constraints, compliance sensitivities, procurement approach, what they optimise for, and any red flags. Start with "Your company…"`;

		// --- SCOPE Engines ---
		case 'scope_cause_analyze':
			return `Analyze the root causes behind this business problem signal.

Trigger: ${str(ctx.trigger)}
Urgency: ${str(ctx.urgency)}/5
Business impact: ${str(ctx.businessImpact)}
Impacted users: ${arr(ctx.impactedUsers).join(', ') || 'Not specified'}

Identify 3-5 potential root causes. For each, explain the cause, its likelihood, and what evidence would confirm it.

Return JSON:
{"causes":[{"id":"cause_1","title":"short title","description":"2-sentence explanation","likelihood":"high|medium|low","evidence":"what would confirm this","category":"process|technology|people|data|policy"}]}`;

		case 'scope_options_recommend':
			return `Based on this problem diagnosis, recommend which approach the team should take.

Problem: ${str(ctx.trigger)}
Root cause hypothesis: ${str(ctx.hypothesis)}
Business impact: ${str(ctx.businessImpact)}
Urgency: ${str(ctx.urgency)}/5
Impacted users: ${arr(ctx.impactedUsers).join(', ') || 'Not specified'}

Evaluate all 5 approaches and recommend the best fit. Be honest — "Do Nothing" is valid if the problem doesn't justify action.

Return JSON:
{"recommended":"buy|build|fix|partner|do_nothing","approaches":[{"approach":"buy","label":"Buy Software","score":0-100,"pros":["pro1","pro2"],"cons":["con1","con2"],"timeline":"estimated timeline","costRange":"rough cost range","riskLevel":"high|medium|low"},{"approach":"build","label":"Build Internally","score":0-100,"pros":[],"cons":[],"timeline":"","costRange":"","riskLevel":""},{"approach":"fix","label":"Fix Existing Process","score":0-100,"pros":[],"cons":[],"timeline":"","costRange":"","riskLevel":""},{"approach":"partner","label":"Partner / Outsource","score":0-100,"pros":[],"cons":[],"timeline":"","costRange":"","riskLevel":""},{"approach":"do_nothing","label":"Do Nothing","score":0-100,"pros":[],"cons":[],"timeline":"N/A","costRange":"$0","riskLevel":""}],"reasoning":"2-3 sentences explaining the recommendation"}`;

		case 'scope_readiness_assess':
			return `Assess organizational readiness for the proposed approach.

Approach: ${str(ctx.selectedApproach)}
Budget estimate: ${str(ctx.budgetEstimate)}
Timeline: ${str(ctx.timeline)}
Stakeholders: ${str(ctx.stakeholders)}
Risk assessment: ${str(ctx.riskAssessment)}
Problem context: ${str(ctx.trigger)}

Score readiness 0-100 and identify gaps/blockers.

Return JSON:
{"score":0-100,"level":"ready|mostly_ready|needs_work|not_ready","gaps":[{"area":"budget|timeline|stakeholders|skills|data|process","title":"short title","detail":"1-sentence explanation","severity":"high|medium|low","action":"recommended mitigation"}],"strengths":["strength1","strength2"],"recommendation":"2-sentence readiness summary"}`;

		case 'scope_brief_generate':
			return `Generate an executive decision brief for leadership review.

Problem signal: ${str(ctx.trigger)}
Root cause: ${str(ctx.hypothesis)}
Recommended approach: ${str(ctx.selectedApproach)}
Budget estimate: ${str(ctx.budgetEstimate)}
Timeline: ${str(ctx.timeline)}
Stakeholders: ${str(ctx.stakeholders)}
Readiness score: ${str(ctx.readinessScore)}/100
Key gaps: ${str(ctx.gaps)}

Return JSON:
{"title":"Brief title","execSummary":"2-3 sentence executive summary","sections":[{"heading":"section heading","content":"1-2 paragraph section content"}],"recommendation":"Clear 1-sentence recommendation","nextSteps":["step1","step2","step3"],"riskNote":"1-sentence key risk acknowledgement"}`;

		case 'scope_import':
			return `Map this SCOPE diagnostic data to SOLVE project fields for a new evaluation project.

SCOPE data:
- Trigger: ${str(ctx.trigger)}
- Root cause: ${str(ctx.hypothesis)}
- Decision: ${str(ctx.decision)}
- Budget: ${str(ctx.budgetEstimate)}
- Timeline: ${str(ctx.timeline)}
- Stakeholders: ${str(ctx.stakeholders)}

Return JSON:
{"projectName":"suggested project name","category":"software category","problemDescription":"refined problem statement","whoAffected":"who is impacted","costOfNothing":"cost of inaction from SCOPE data","successIn90Days":"90-day success criteria","budget":"budget range","triggers":["trigger1","trigger2"]}`;

		// Task-based routing for legacy evaluate engine
		case 'evaluate': {
			const task = str(ctx.task);
			if (task === 'suggest_criteria') {
				return `I'm evaluating vendors for: ${str(ctx.projectName)} (category: ${str(ctx.category)}).
Vendors: ${arr(ctx.vendors).join(', ') || 'not yet specified'}
${arr(ctx.existingCriteria).length > 0 ? `Existing criteria: ${arr(ctx.existingCriteria).join(', ')}` : 'No criteria yet.'}

Suggest 5-8 evaluation criteria. Return JSON:
{"criteria":[{"name":"...","category":"functional|technical|commercial|strategic|risk","weight":1-10,"description":"..."}]}`;
			}
			if (task === 'vendor_analysis') {
				return `Analyze vendor "${str(ctx.vendor)}" for ${str(ctx.projectName)} (${str(ctx.category)}).
Criteria: ${JSON.stringify(ctx.criteria)}
Scores: ${JSON.stringify(ctx.scores)}
Profile: ${JSON.stringify(ctx.profile ?? {})}

Return JSON:
{"strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"recommendation":"2-sentence recommendation","confidence":0-100}`;
			}
			return JSON.stringify(ctx, null, 2);
		}

		default:
			return JSON.stringify(ctx, null, 2);
	}
}

// ============================================================
// Company Context Injection (from prototype's getCompanyContext)
// ============================================================

function buildCompanyContext(profile: Record<string, unknown> | undefined): string {
	if (!profile || Object.keys(profile).length === 0) return '';

	const parts: string[] = ['=== BUYER CONTEXT ==='];
	if (profile.name) parts.push(`Company: ${profile.name}`);
	if (profile.industry) parts.push(`Industry: ${profile.industry}`);
	if (profile.size) parts.push(`Size: ${profile.size}`);
	if (profile.budget) parts.push(`Annual software budget: ${profile.budget}`);
	if (profile.maturity) parts.push(`Procurement maturity: ${profile.maturity}`);
	if (profile.process) parts.push(`Decision process: ${profile.process}`);
	if (profile.compliance) parts.push(`Compliance requirements: ${arr(profile.compliance).join(', ')}`);
	if (profile.priorities) parts.push(`Organisational priorities: ${arr(profile.priorities).join(', ')}`);
	if (profile.vendorPref) parts.push(`Vendor tier preference: ${arr(profile.vendorPref).join(', ')}`);
	if (profile.regions) parts.push(`Operating regions: ${arr(profile.regions).join(', ')}`);
	if (profile.stack) parts.push(`Existing tech stack: ${profile.stack}`);
	if (profile.notes) parts.push(`Additional context: ${profile.notes}`);
	parts.push('=== END BUYER CONTEXT ===');
	parts.push('Tailor all analysis, suggestions, and recommendations to the above buyer profile. Do not mention the context block in your response.');

	return parts.join('\n');
}

// Helpers
function str(v: unknown): string {
	if (v === null || v === undefined) return '';
	if (typeof v === 'string') return v;
	if (typeof v === 'number' || typeof v === 'boolean') return String(v);
	return JSON.stringify(v);
}

function arr(v: unknown): any[] {
	if (Array.isArray(v)) return v;
	return [];
}

function estimateConfidence(depth: EngineDepth, result: any): number {
	const outputTokens = result.usage?.output_tokens ?? 0;
	let base = depth === 'deep' ? 75 : depth === 'standard' ? 65 : 55;
	if (outputTokens > 1000) base += 10;
	if (outputTokens > 2000) base += 5;
	return Math.min(base, 95);
}
