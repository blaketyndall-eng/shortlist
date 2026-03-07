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
	vendor_research: 2048,
	score_prefill: 400,
	demo_questions: 600,
	demo_debrief: 600,
	score_anomaly: 600,
	negotiation_coach: 1200,
	hidden_cost_spotter: 600,
	vendor_comparison_narrative: 2000,
	requirement_elicitation: 800,
	market_intelligence: 1000,
	risk_register: 700,
	contract_risk: 700,
	score_explanation: 2000,
	problem_brief: 800,
	executive_brief: 800,
	decision_readiness: 700,
	company_autofill: 1200,
	compliance_suggest: 400,
	priorities_suggest: 300,
	stack_suggest: 300,
	context_notes: 500,
	profile_interview: 600,
	reference_questions: 500,
	// Alignment engines
	alignment_analyze: 600,
	alignment_summary: 300,
	// Executive engines
	executive_insight: 500,
	executive_milestone_brief: 1000,
	// Phase 10 engines
	project_health_check: 500,
	smart_defaults: 400,
	vendor_change_analyzer: 300,
	negotiation_extract: 400,
	deal_debrief: 600,
};

// Model overrides for specific engines (prototype uses specific model per engine)
const ENGINE_MODEL_OVERRIDE: Partial<Record<string, string>> = {
	category_detect: 'claude-haiku-4-5-20251001',
	challenges: 'claude-haiku-4-5-20251001',
	vendor_research: 'claude-sonnet-4-6',
	score_prefill: 'claude-haiku-4-5-20251001',
	compliance_suggest: 'claude-haiku-4-5-20251001',
	priorities_suggest: 'claude-haiku-4-5-20251001',
	stack_suggest: 'claude-haiku-4-5-20251001',
	profile_interview: 'claude-haiku-4-5-20251001',
	demo_questions: 'claude-haiku-4-5-20251001',
	reference_questions: 'claude-haiku-4-5-20251001',
	problem_brief: 'claude-sonnet-4-6',
	score_explanation: 'claude-opus-4-6',
	executive_brief: 'claude-opus-4-6',
	vendor_comparison_narrative: 'claude-sonnet-4-6',
	requirement_elicitation: 'claude-sonnet-4-6',
	market_intelligence: 'claude-sonnet-4-6',
	// Alignment engines
	alignment_analyze: 'claude-sonnet-4-6',
	alignment_summary: 'claude-haiku-4-5-20251001',
	// Executive engines
	executive_insight: 'claude-sonnet-4-6',
	executive_milestone_brief: 'claude-opus-4-6',
	// Phase 10 engines
	project_health_check: 'claude-haiku-4-5-20251001',
	smart_defaults: 'claude-haiku-4-5-20251001',
	vendor_change_analyzer: 'claude-haiku-4-5-20251001',
	negotiation_extract: 'claude-haiku-4-5-20251001',
	deal_debrief: 'claude-sonnet-4-6',
};

interface EngineRequest {
	engine: string;
	depth: EngineDepth;
	context: Record<string, unknown>;
	projectId: string;
	task?: string;
}

// JSON schema shapes for output validation per engine
const ENGINE_SCHEMAS: Record<string, { required: string[]; type: 'object' | 'array' }> = {
	category_detect: { required: ['category', 'label', 'confidence'], type: 'object' },
	vendor_suggest: { required: ['name', 'tagline', 'tier'], type: 'array' },
	challenges: { required: ['severity', 'title', 'question'], type: 'array' },
	vendor_research: { required: ['overview', 'typicalPricing', 'knownStrengths'], type: 'object' },
	score_prefill: { required: ['scores'], type: 'object' },
	score_anomaly: { required: [], type: 'array' },
	score_explanation: { required: ['explanations'], type: 'object' },
	negotiation_coach: { required: ['overallAssessment', 'counterAsks', 'nextMove'], type: 'object' },
	hidden_cost_spotter: { required: ['hiddenCosts', 'topAdvice'], type: 'object' },
	risk_register: { required: [], type: 'array' },
	contract_risk: { required: ['criticalClauses', 'topPriority'], type: 'object' },
	problem_brief: { required: ['execSummary', 'problem'], type: 'object' },
	executive_brief: { required: [], type: 'object' },
	decision_readiness: { required: ['questions'], type: 'object' },
	demo_questions: { required: ['text', 'crit'], type: 'array' },
	reference_questions: { required: ['question', 'area'], type: 'array' },
	company_autofill: { required: ['industry', 'size'], type: 'object' },
	profile_interview: { required: [], type: 'object' },
	alignment_analyze: { required: ['overall', 'gaps'], type: 'object' },
	alignment_summary: { required: ['headline', 'status'], type: 'object' },
	executive_insight: { required: ['title', 'insight'], type: 'object' },
	executive_milestone_brief: { required: ['title', 'summary', 'sections'], type: 'object' },
	vendor_comparison_narrative: { required: ['narrative', 'verdicts'], type: 'object' },
	requirement_elicitation: { required: ['questions'], type: 'object' },
	market_intelligence: { required: ['trends', 'insights'], type: 'object' },
	// Phase 10 engines
	project_health_check: { required: ['nudges'], type: 'object' },
	smart_defaults: { required: ['criteria', 'constraints'], type: 'object' },
	vendor_change_analyzer: { required: ['changeType', 'severity', 'summary'], type: 'object' },
	negotiation_extract: { required: [], type: 'object' },
	deal_debrief: { required: ['lessonsSummary'], type: 'object' },
};

// Max retry attempts for validation failures
const MAX_RETRIES = 2;

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	if (!env.ANTHROPIC_API_KEY) {
		error(500, 'AI service not configured');
	}

	const body: EngineRequest = await request.json();

	if (!body.engine || !body.projectId) {
		error(400, 'Missing required fields: engine, projectId');
	}

	// Auto-inject company profile if not already provided in context
	const supabaseClient = createServerSupabase(cookies);
	if (!body.context.companyProfile && locals.user) {
		try {
			const { data: profileRow } = await supabaseClient
				.from('profiles')
				.select('company_profile')
				.eq('id', locals.user.id)
				.single();
			if (profileRow?.company_profile && Object.keys(profileRow.company_profile).length > 0) {
				body.context.companyProfile = profileRow.company_profile;
			}
		} catch {
			// Non-critical — proceed without company context
		}
	}

	// Auto-inject project intelligence for project-scoped engines
	// Skip for company-profile-only engines and non-project contexts
	const SKIP_PROJECT_INTELLIGENCE = new Set([
		'company_autofill', 'compliance_suggest', 'priorities_suggest',
		'stack_suggest', 'context_notes', 'profile_interview',
	]);
	if (
		body.projectId &&
		body.projectId !== 'company-profile' &&
		!SKIP_PROJECT_INTELLIGENCE.has(body.engine) &&
		!body.context._projectIntelligence // avoid double-injection
	) {
		try {
			const intelligence = await buildProjectIntelligence(body.projectId, supabaseClient);
			if (intelligence) {
				body.context._projectIntelligence = intelligence;
			}
		} catch {
			// Non-critical — proceed without project intelligence
		}
	}

	const depth = body.depth ?? 'standard';
	const model = ENGINE_MODEL_OVERRIDE[body.engine] ?? MODEL_MAP[depth] ?? MODEL_MAP.standard;
	const maxTokens = TOKEN_LIMITS[body.engine] ?? (depth === 'quick' ? 1024 : 4096);
	const startTime = Date.now();

	try {
		const systemPrompt = buildSystemPrompt(body.engine, body.context);
		const userPrompt = buildUserPrompt(body.engine, body.context);
		const schema = ENGINE_SCHEMAS[body.engine];

		let parsedResult: unknown;
		let aiResult: any;
		let validationPassed = false;
		let attempts = 0;
		let totalInputTokens = 0;
		let totalOutputTokens = 0;
		let validationErrors: string[] = [];

		// Retry loop for schema validation
		while (attempts < (schema ? MAX_RETRIES : 1) && !validationPassed) {
			attempts++;

			const retryHint = attempts > 1
				? `\n\nPREVIOUS ATTEMPT FAILED VALIDATION: ${validationErrors.join('; ')}. Please fix and return valid JSON.`
				: '';

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
					messages: [{ role: 'user', content: userPrompt + retryHint }],
				}),
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				error(502, `AI provider error: ${err.error?.message ?? response.statusText}`);
			}

			aiResult = await response.json();
			totalInputTokens += aiResult.usage?.input_tokens ?? 0;
			totalOutputTokens += aiResult.usage?.output_tokens ?? 0;

			// Parse JSON from response
			try {
				const text = aiResult.content?.[0]?.text ?? '';
				const cleaned = text.replace(/```json\n?|```/g, '').trim();
				parsedResult = JSON.parse(cleaned);
			} catch {
				parsedResult = { text: aiResult.content?.[0]?.text ?? '' };
				if (schema) {
					validationErrors = ['Response was not valid JSON'];
					continue;
				}
			}

			// Validate against schema if defined
			if (schema) {
				validationErrors = validateEngineOutput(parsedResult, schema);
				validationPassed = validationErrors.length === 0;
			} else {
				validationPassed = true;
			}
		}

		const latency = Date.now() - startTime;
		const credits = CREDIT_MAP[model] ?? 5;

		// Track usage (sum all retry attempts)
		await supabaseClient.from('ai_usage').insert({
			user_id: locals.user.id,
			project_id: body.projectId,
			engine: body.engine,
			model,
			input_tokens: totalInputTokens,
			output_tokens: totalOutputTokens,
			credits_used: credits * attempts,
			latency_ms: latency,
			...(attempts > 1 ? { metadata: { retries: attempts, validationErrors } } : {}),
		});

		const confidence = estimateConfidence(depth, body.engine, parsedResult, {
			validationPassed,
			attempts,
			outputTokens: totalOutputTokens,
			latency,
		});

		return json({
			engine: body.engine,
			stage: 'recommend' as PipelineStage,
			data: parsedResult,
			result: parsedResult,
			model: model as AIModel,
			confidence,
			tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
			...(attempts > 1 ? { retries: attempts } : {}),
			validated: validationPassed,
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
		category_detect: 'You are a software purchase intelligence expert. Respond ONLY with valid JSON, no markdown.',
		vendor_suggest: 'You are a B2B software purchase intelligence advisor. Return ONLY valid JSON, no markdown.',
		challenges: 'You are a purchase intelligence consultant. Respond ONLY with a JSON array, no markdown.',
		vendor_research: 'You are a senior B2B software purchase intelligence analyst with deep expertise in vendor evaluation, market positioning, and TCO analysis. Be specific with numbers, names, and facts. Avoid generic statements. Return ONLY valid JSON, no markdown.',

		// --- Evaluate Phase ---
		evaluate: 'You are Shortlist AI, a purchase intelligence assistant specializing in vendor evaluation: scoring, comparison, and analysis. Always respond with structured, actionable insights.',
		score_prefill: 'You are a B2B software analyst. Return ONLY valid JSON, no markdown.',
		score_anomaly: 'You are a purchase intelligence analyst. Return ONLY valid JSON.',
		score_explanation: 'You are a purchase intelligence analyst writing score justifications. Return ONLY valid JSON.',
		negotiation_coach: 'You are a seasoned B2B software negotiation expert. Return ONLY valid JSON.',
		hidden_cost_spotter: 'You are a software purchase cost expert. Return ONLY valid JSON.',
		risk_register: 'You are a purchase risk analyst. Return ONLY valid JSON.',
		contract_risk: 'You are a software contract expert. Return ONLY valid JSON.',
		problem_brief: 'You are a senior B2B purchase intelligence analyst writing a problem brief for a software evaluation. Synthesize the buyer\'s pain points, requirements, and context into a clear, actionable brief that aligns the evaluation team. Be specific, reference the buyer\'s actual situation, and provide peer benchmarks. Return ONLY valid JSON, no markdown.',
		executive_brief: 'You are a senior management consultant writing an executive decision memo. Write in clear, confident prose. No bullet points.',
		decision_readiness: 'You are a decision quality facilitator using structured decision-making. Return ONLY valid JSON.',

		// --- Demo Phase ---
		demo_briefing: 'You are a B2B purchase intelligence expert helping prepare for a vendor demo. Return ONLY valid JSON.',
		demo_debrief: 'You are a purchase evaluation facilitator synthesizing demo feedback. Return ONLY valid JSON.',
		demo_questions: 'You are a B2B purchase intelligence expert. Generate targeted vendor-specific demo questions. Return ONLY valid JSON.',
		reference_questions: 'You are an experienced purchase reference checker. Return ONLY valid JSON.',

		// --- Company Profile ---
		company_autofill: 'You are a purchase intelligence assistant. Analyse a company description and return a structured JSON profile. Only choose values from the provided option lists. Return ONLY valid JSON, no markdown.',
		compliance_suggest: 'You are a compliance expert. Return ONLY a JSON array of strings, no markdown.',
		priorities_suggest: 'You are a purchase intelligence strategist. Return ONLY a JSON array of strings, no markdown.',
		stack_suggest: 'You are a solutions architect. Return ONLY a comma-separated list of tool names, no markdown or explanation.',
		context_notes: 'You are a purchase intelligence assistant writing buyer context notes. Write in second person, clear and direct. 3–5 sentences max.',
		profile_interview: 'You are a purchase intelligence assistant extracting structured company profile data from conversational answers. Return ONLY valid JSON with the fields you can extract. Use null for fields that cannot be determined. Match values to the allowed option lists exactly.',

		// --- Phase 10: Intelligence Web ---
		project_health_check: 'You are a purchase intelligence advisor monitoring project health. Analyze project state and identify 2-3 actionable nudges: stalled progress, unresolved risks, missing steps, or opportunities. Return ONLY valid JSON.',
		smart_defaults: 'You are a purchase intelligence advisor suggesting defaults for new projects based on past patterns. Return ONLY valid JSON.',
		vendor_change_analyzer: 'You are a vendor intelligence monitor detecting material changes between enrichment cycles. Return ONLY valid JSON.',
		negotiation_extract: 'You are a negotiation intelligence analyst extracting structured data from negotiation notes. Return ONLY valid JSON.',
		deal_debrief: 'You are a senior purchase intelligence consultant synthesizing lessons learned from completed vendor evaluations. Be specific and actionable. Return ONLY valid JSON.',

		// --- Comparison & Intelligence ---
		vendor_comparison_narrative: 'You are a senior B2B purchase intelligence analyst writing comparative vendor narratives for executive decision-makers. Be specific, data-driven, and opinionated. Return ONLY valid JSON.',
		requirement_elicitation: 'You are a purchase intelligence consultant who helps buyers uncover hidden requirements they haven\'t considered. Draw on deep domain expertise. Return ONLY valid JSON.',
		market_intelligence: 'You are a market research analyst specializing in B2B software markets. Provide specific, current intelligence about market trends, vendor movements, and category dynamics. Return ONLY valid JSON.',

		// --- Discovery & RFP ---
		discovery: 'You are Shortlist AI, specializing in vendor discovery: identifying, researching, and recommending vendors for specific use cases.',
		rfp: 'You are Shortlist AI, specializing in RFP generation: creating evaluation questionnaires, requirement documents, and scoring rubrics.',

		// --- Implementation ---
		implement: 'You are Shortlist AI, specializing in implementation planning: timelines, change management, and vendor onboarding.',

		// --- Alignment Engines ---
		alignment_analyze: 'You are an organizational alignment analyst for B2B purchase intelligence teams. Given poll responses grouped by role (admin, member, leadership), calculate alignment scores (0-100), identify gaps between roles and dimensions, and provide actionable recommendations to improve team consensus. Return ONLY valid JSON, no markdown.',
		alignment_summary: 'You are a team alignment summarizer. Generate a concise alignment snapshot. Return ONLY valid JSON, no markdown.',

		// --- Executive Engines ---
		executive_insight: 'You are a purchase intelligence analyst generating executive-level insights. Synthesize project activity, vendor evaluations, and team alignment data into concise, actionable insights for leadership. Return ONLY valid JSON, no markdown.',
		executive_milestone_brief: 'You are a purchase intelligence briefing writer for C-suite executives. Given project data, vendor evaluations, alignment scores, and team activity, produce a structured briefing. Be concise, data-driven, highlight risks and decisions needed. Return ONLY valid JSON, no markdown.',
	};

	const basePrompt = prompts[engine] ?? prompts.evaluate;

	// Layer context: company context + project intelligence
	const projectIntelligence = formatProjectIntelligence(context._projectIntelligence as string | undefined);
	const contextBlocks = [basePrompt, companyContext, projectIntelligence].filter(Boolean).join('\n\n');
	return contextBlocks;
}

// ============================================================
// USER PROMPTS - Full templates from prototype
// ============================================================

function buildUserPrompt(engine: string, ctx: Record<string, unknown>): string {
	switch (engine) {
		case 'category_detect':
			return `Identify the most specific software category for this business problem. Read the problem carefully and match to the MOST RELEVANT category — don't default to generic categories.

Categories (pick the best fit):
- crm: CRM & Sales (Salesforce, HubSpot, Pipedrive — customer relationship management, sales pipeline, lead tracking)
- hris: HR & People Management (BambooHR, Rippling, Gusto — HRIS, payroll, employee onboarding, workforce management, talent management, recruiting)
- project: Project Management (Asana, Monday, Jira — task tracking, project planning, workflow automation)
- finance: Finance & Accounting (QuickBooks, Xero, Bill.com — AP/AR, expense management, financial planning)
- marketing: Marketing & Advertising (Marketo, Mailchimp, HubSpot Marketing — email marketing, marketing automation, analytics)
- support: Customer Support & ITSM (Zendesk, Freshdesk, ServiceNow — helpdesk, ticketing, customer service, IT service management)
- data: Data & Analytics (Tableau, Looker, Snowflake — BI, data warehousing, data integration, reporting)
- devtools: Developer Tools (GitHub, GitLab, Datadog — CI/CD, monitoring, code management, API platforms)
- collab: Collaboration & Communication (Slack, Teams, Notion — team chat, document collaboration, knowledge management)
- security: Security & Compliance (Okta, CrowdStrike, Vanta — identity management, endpoint protection, compliance automation)
- ecommerce: E-Commerce & Payments (Shopify, Stripe, BigCommerce — online stores, payment processing, order management)
- ops: Operations & IT (Zapier, ServiceNow, Kandji — IT asset management, workflow automation, MDM, procurement)
- erp: ERP & Business Suite (NetSuite, SAP, Odoo — enterprise resource planning, integrated business management)
- lms: Learning & Training (Lessonly, TalentLMS, Docebo — LMS, employee training, onboarding training, compliance training)
- other: Other (only if nothing above fits at all)

IMPORTANT: Match based on the PROBLEM being solved, not surface-level keywords. Employee onboarding → hris. IT ticket tracking → support. Sales pipeline → crm.

Return JSON:
{"category":"category_id","label":"Full Category Name","icon":"emoji","confidence":0-100,"why":"one sentence explaining why this category fits the problem","alternatives":[{"category":"id","label":"name","icon":"emoji","confidence":0-100}]}

Problem: ${str(ctx.text).slice(0, 600)}`;

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

		case 'problem_brief':
			return `Generate a comprehensive problem brief for this software evaluation. This brief will be the shared starting point for the entire evaluation team.

Category: ${str(ctx.category)}
Approach: ${str(ctx.approach)}
Existing tool: ${str(ctx.existingTool) || 'none'}
Team size: ${str(ctx.teamSize)}
Annual budget: ${str(ctx.budget)}
Vendors in scope: ${str(ctx.vendorCount)}

Problem description: ${str(ctx.problemDesc)}
Who's affected: ${str(ctx.whoAffected)}
Cost of doing nothing: ${str(ctx.costOfNothing)}
Success in 90 days: ${str(ctx.successIn90)}
Must-haves: ${arr(ctx.mustHaves).join(', ') || 'not yet defined'}
Hard constraints: ${arr(ctx.constraints).join(', ') || 'not yet defined'}

Return JSON:
{"execSummary":"3-4 sentence executive summary covering the problem, scope, approach, and key constraints. Reference specific details from the buyer's situation — team size, budget, existing tools, timeline. Make it feel like a consultant wrote it, not a template.","problem":"2-3 paragraph problem statement that goes deeper than the buyer's description. Connect the symptoms they described to root causes. Reference who's affected and the business impact. Show insight they may not have articulated themselves.","successCriteria":"2-3 sentences expanding on their 90-day success vision. Add measurable benchmarks based on typical outcomes for this category. Example: 'Based on similar implementations, expect 40-60% reduction in manual onboarding tasks within 60 days.'","peerBenchmark":"2-3 sentences comparing this buyer's situation to industry peers. How does their budget compare? Their timeline? What do similar-sized companies in their position typically prioritize? Provide genuine peer insight, not generic statements."}

Be specific to THIS buyer's situation. Reference their actual numbers, tools, and pain points. Avoid generic advice.`;

		case 'vendor_research':
			return `Conduct a comprehensive analysis of "${str(ctx.vendorName)}" for a ${str(ctx.category)} evaluation.

${ctx.vendorWebsite ? `Website: ${str(ctx.vendorWebsite)}` : ''}
${ctx.vendorOverview ? `Existing overview: ${str(ctx.vendorOverview)}` : ''}
${ctx.problem ? `Buyer's problem: ${str(ctx.problem)}` : ''}
${ctx.teamSize ? `Team size: ${str(ctx.teamSize)}` : ''}
${ctx.budget ? `Budget: ${str(ctx.budget)}` : ''}

Return JSON with specific, actionable intelligence:
{"overview":"3-4 sentence executive summary","typicalPricing":"specific pricing tiers and ranges with numbers","pricingModel":"per-seat|per-usage|flat-rate|tiered|custom-quote|freemium","knownStrengths":["4 specific strengths with detail"],"knownWeaknesses":["3 specific weaknesses"],"implementationComplexity":"low|medium|high","implementationNote":"2-sentence reality check","implementationTimeline":"timeline range","g2Position":"market position with approx rating","watchOutFor":["2-3 contract/pricing gotchas"],"competitors":["5 direct competitors"],"targetCustomerSegments":["2-3 ideal customer profiles"],"keyIntegrations":["5 key integrations"],"securityCertifications":["known certs"],"contractTerms":"typical terms","deploymentModel":"cloud-only|on-premise|hybrid","supportModel":"support tiers","vendorStability":"financial health assessment"}

Be specific with real numbers, names, and facts. Avoid generic statements.`;

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
Contract terms offered: ${str(ctx.contractTerms) || 'unknown'}
Competing vendors: ${str(ctx.competitors) || 'unknown'}

Negotiation log so far:
${str(ctx.negotiationLog)}

Provide specific, actionable negotiation coaching. Reference real benchmarks for this category.

Return JSON:
{"overallAssessment":"2-sentence read on negotiation position and leverage","benchmarkInsight":"what deals like this typically achieve — cite specific discount ranges","counterAsks":[{"ask":"specific counter-ask","rationale":"why this works","priority":"must|should|nice"}],"concessions":["things you can offer in exchange for better terms"],"redFlags":["specific warning signs in the current deal"],"walkAwaySignal":"specific conditions that should trigger walking away","nextMove":"best next tactical move with specific language to use","timingAdvice":"when to push and when to wait based on sales cycle dynamics","contractWatchList":["specific contract clauses to negotiate: auto-renewal, price lock, termination, SLA penalties"]}`;

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
			return `Generate a 5-question decision readiness interview to pressure-test this purchase decision before committing.

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
{"name":"company name or null","industry":"one of: Technology, Healthcare, Financial Services, Manufacturing, Retail, Education, Government, Non-profit, Professional Services, Media, Energy, Real Estate, Other","size":"one of: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+","budget":"one of: Under $10k, $10k-$50k, $50k-$100k, $100k-$500k, $500k-$1M, $1M+","maturity":"one of: Ad-hoc, Developing, Established, Optimised","compliance":["from: SOC 2 Type II, ISO 27001, GDPR, HIPAA, FedRAMP, PCI-DSS, CCPA, NIST 800-53, FINRA, None required"],"priorities":["top 3-4 from: Cost reduction, Security first, Fast deployment, Ease of adoption, Deep integrations, Vendor consolidation, Scalability, Data sovereignty, Open-source preferred, Local support"],"vendorPref":["from: Enterprise tier, Mid-market, SMB-friendly, Open-source, Best of breed, Suite/platform"],"process":"one of: Individual, Committee, Formal RFP, Board approval","regions":["from: North America, Europe, APAC, LATAM, Middle East, Africa, Global"],"stack":"comma-separated tools or null","notes":"2-3 sentence purchase context","typicalTimeline":"one of: Under 2 weeks, 2-4 weeks, 1-3 months, 3-6 months, 6-12 months, 12+ months or null","stakeholders":"key decision-maker roles or null","dealBreakers":["from: No SSO support, No on-prem option, Vendor lock-in, No API access, Poor mobile experience, No audit logging, Limited customization, No SLA guarantees, Data residency issues, No offline mode"],"integrationReqs":["from: SSO/SAML, REST API, Webhooks, Native Salesforce, Native Slack, Native Microsoft 365, Native Google Workspace, SCIM provisioning, Data warehouse sync, Custom ETL, iPaaS (Zapier/Make/Workato)"],"painPoints":"key frustrations or null","successMetrics":"how they measure success or null"}`;

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

		case 'profile_interview':
			return `Question asked: "${str(ctx.questionAsked)}"
User's answer: "${str(ctx.userAnswer)}"
Extract type: ${str(ctx.extractType)}
Current profile state: ${str(ctx.currentProfile)}

Based on the user's answer, extract structured data. Return JSON with ONLY the fields you can confidently extract.

Field rules by extract type:
- basics: {"name":"company name","industry":"one of: Technology, Healthcare, Financial Services, Manufacturing, Retail, Education, Government, Non-profit, Professional Services, Media, Energy, Real Estate, Other","size":"one of: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+"}
- budget_maturity: {"budget":"one of: Under $10k, $10k-$50k, $50k-$100k, $100k-$500k, $500k-$1M, $1M+","maturity":"one of: Ad-hoc, Developing, Established, Optimised"}
- governance: {"process":"one of: Individual, Committee, Formal RFP, Board approval","stakeholders":"free text describing key decision makers","approvalWorkflow":"free text describing approval steps"}
- stack: {"stack":"comma-separated tool names"}
- integrations: {"integrationReqs":["from: SSO/SAML, REST API, Webhooks, Native Salesforce, Native Slack, Native Microsoft 365, Native Google Workspace, SCIM provisioning, Data warehouse sync, Custom ETL, iPaaS (Zapier/Make/Workato)"]}
- compliance: {"compliance":["from: SOC 2 Type II, ISO 27001, GDPR, HIPAA, FedRAMP, PCI-DSS, CCPA, NIST 800-53, FINRA, None required"],"regions":["from: North America, Europe, APAC, LATAM, Middle East, Africa, Global"]}
- pain_lessons: {"painPoints":"free text","pastVendorLessons":"free text"}
- dealbreakers_success: {"dealBreakers":["from: No SSO support, No on-prem option, Vendor lock-in, No API access, Poor mobile experience, No audit logging, Limited customization, No SLA guarantees, Data residency issues, No offline mode"],"successMetrics":"free text","priorities":["from: Cost reduction, Security first, Fast deployment, Ease of adoption, Deep integrations, Vendor consolidation, Scalability, Data sovereignty, Open-source preferred, Local support"]}

Return ONLY JSON, no explanation.`;

		case 'context_notes':
			return `Based on this company profile:
${str(ctx.fullProfile)}

Write a concise context note (3-5 sentences) that an AI assistant should know when helping this company evaluate and buy software. Cover: key constraints, compliance sensitivities, purchase approach, what they optimise for, and any red flags. Start with "Your company…"`;

		// --- Alignment Engines ---
		case 'alignment_analyze':
			return `Analyze these team alignment poll responses and identify gaps.

Poll: "${str(ctx.pollTitle)}"
Context: ${str(ctx.contextType)} (${str(ctx.solveStage) || 'standalone'})
Project: ${str(ctx.projectName)}

Responses grouped by role:
${str(ctx.responsesByRole)}

Total respondents: ${str(ctx.totalRespondents)}

Return JSON:
{"overall":0-100,"byRole":{"admin":0-100,"member":0-100,"leadership":0-100},"byDimension":{"${str(ctx.contextType)}":0-100},"gaps":[{"dimension":"area","spread":number,"highRole":"role","lowRole":"role","recommendation":"actionable recommendation"}],"insights":["3-5 key observations"],"recommendations":["2-3 actionable next steps"]}

Score interpretation: 80-100 = strong alignment, 60-79 = moderate (needs attention), 40-59 = weak (action required), <40 = critical misalignment.
Spread > 20 indicates a significant gap between roles.`;

		case 'alignment_summary':
			return `Generate a brief alignment snapshot for this project.

Project: ${str(ctx.projectName)}
Current stage: ${str(ctx.currentStage)}
Active polls: ${str(ctx.activePolls)}
Overall alignment: ${str(ctx.overallScore)}/100
Role breakdown: ${str(ctx.roleBreakdown)}
Top gaps: ${str(ctx.topGaps)}

Return JSON:
{"headline":"one-line alignment status","status":"strong|moderate|weak|critical","keyInsight":"most important observation","action":"recommended next action"}`;

		case 'executive_insight':
			return `Generate an executive insight for this project activity.

Project: ${str(ctx.projectName)}
Trigger: ${str(ctx.trigger)}
Current stage: ${str(ctx.currentStage)}
Vendors evaluated: ${str(ctx.vendorCount)}
Alignment score: ${str(ctx.alignmentScore)}/100
Recent activity: ${str(ctx.recentActivity)}
Budget: ${str(ctx.budget)}

Return JSON:
{"title":"insight title","insight":"2-3 sentence executive insight","impact":"business impact statement","urgency":"low|medium|high","recommendedAction":"what leadership should do"}`;

		case 'executive_milestone_brief': {
			return `Generate an executive briefing for this purchase intelligence milestone.

Project: ${str(ctx.projectName)}
Milestone: ${str(ctx.milestoneType)}
Category: ${str(ctx.category)}
Problem: ${str(ctx.problem)}
Budget: ${str(ctx.budget)}
Team size: ${str(ctx.teamSize)}

Current stage: ${str(ctx.currentStage)}
Stages completed: ${str(ctx.stagesCompleted)}

Vendor pipeline:
${str(ctx.vendorSummary)}

Alignment data:
${str(ctx.alignmentSummary)}

Key decisions pending:
${str(ctx.pendingDecisions)}

Recent activity:
${str(ctx.recentActivity)}

Return JSON:
{"title":"briefing title","summary":"2-3 sentence executive summary","sections":[{"heading":"section title","content":"section content","type":"text|metric|list|alert"}],"keyMetrics":{"vendorsEvaluated":number,"alignmentScore":number,"budgetUtilization":number,"riskLevel":"low|medium|high","activePolls":number,"teamParticipation":number},"recommendedActions":["2-3 prioritized actions for leadership"]}

Be concise, data-driven, and actionable. Highlight risks and decisions needed. Max 400 words for all sections combined.`;
		}

		// --- Comparison Narrative ---
		case 'vendor_comparison_narrative':
			return `Write a comparative analysis of these shortlisted vendors for an executive audience.

Problem being solved: ${str(ctx.problem)}
Category: ${str(ctx.category)}
Budget: ${str(ctx.budget)}
Team size: ${str(ctx.teamSize)}

Vendors and their scores:
${str(ctx.vendorSummaries)}

Evaluation criteria and weights:
${str(ctx.criteriaWeights)}

Write a nuanced comparison that goes beyond the numbers. For each vendor, explain:
- What this vendor gets uniquely right for THIS buyer
- Where it falls short vs the others
- The hidden trade-off buyers often miss

Return JSON:
{"narrative":"4-6 paragraph comparative analysis (800 words max)","verdicts":[{"vendor":"name","verdict":"1-sentence final verdict","bestFor":"when to choose this one","watchOut":"biggest risk"}],"recommendation":"2-sentence overall recommendation","confidenceNote":"honest assessment of analysis confidence and what data is missing"}`;

		// --- Requirement Elicitation ---
		case 'requirement_elicitation':
			return `Help this buyer uncover requirements they may not have considered for their ${str(ctx.category)} evaluation.

Problem: ${str(ctx.problem)}
Current approach: ${str(ctx.existingTool) || 'none'}
Team size: ${str(ctx.teamSize)}
Budget: ${str(ctx.budget)}
Industry: ${str(ctx.industry)}
Must-haves already identified: ${str(ctx.currentMustHaves)}
Constraints identified: ${str(ctx.currentConstraints)}

Generate 5-7 probing questions that surface hidden requirements. Focus on:
- Integration dependencies they may not have considered
- Scale/growth requirements for the next 2-3 years
- Security and compliance implications specific to their industry
- Change management and adoption risks
- Total cost of ownership beyond license fees
- Data migration and portability concerns

Return JSON:
{"questions":[{"question":"the probing question","area":"integration|scale|security|adoption|cost|data|workflow","why":"why this matters for their situation","typical_discovery":"what teams usually discover when they answer this"}],"blindSpots":["2-3 common blind spots for ${str(ctx.category)} evaluations"]}`;

		// --- Market Intelligence ---
		case 'market_intelligence':
			return `Provide market intelligence for the ${str(ctx.category)} software category.

Buyer context:
- Industry: ${str(ctx.industry)}
- Size: ${str(ctx.teamSize)}
- Budget: ${str(ctx.budget)}
- Problem: ${str(ctx.problem)}
- Vendors being evaluated: ${str(ctx.vendorNames)}

Provide specific, actionable intelligence covering:
1. Category trends (consolidation, new entrants, pricing shifts)
2. Vendor-specific movements (recent funding, acquisitions, leadership changes)
3. Buyer leverage opportunities (end of quarter, competitive dynamics, switching trends)
4. Risk signals (vendor stability, market shifts that could affect this purchase)

Return JSON:
{"trends":[{"trend":"specific trend","impact":"how it affects this buyer","timeframe":"when relevant"}],"insights":[{"type":"opportunity|risk|trend","title":"short title","detail":"2-sentence detail","actionable":"what the buyer should do"}],"negotiationLeverage":["timing or competitive dynamics that help the buyer"],"categoryOutlook":"2-sentence forward-looking assessment"}`;

		// --- Phase 10 Engines ---
		case 'project_health_check':
			return `Analyze this project and identify 2-3 actionable nudges for the project owner.

Project intelligence is already in the system context. Additional signals:
- Days since project created: ${str(ctx.daysSinceCreated)}
- Days since last activity: ${str(ctx.daysSinceLastActivity)}
- Current step: ${str(ctx.currentStep)}
- Vendors scored: ${str(ctx.vendorsScored)} / ${str(ctx.totalVendors)}
- Criteria defined: ${str(ctx.criteriaCount)}
- Alignment polls active: ${str(ctx.activePolls)}

Return JSON:
{"nudges":[{"type":"warning|info|action|success","title":"short title","detail":"1-2 sentence detail with specific data","link":"suggested page to visit (e.g. /project/ID/evaluate/scoring)","priority":"high|medium|low"}],"overallHealth":"on-track|needs-attention|stalled|at-risk","healthScore":0-100}

Focus on actionable, specific insights. Reference actual project data. Don't be generic.`;

		case 'smart_defaults':
			return `Based on past project patterns and this buyer's profile, suggest smart defaults for a new ${str(ctx.category)} evaluation.

Past project data:
${str(ctx.pastProjectSummary)}

Buyer profile summary:
${str(ctx.buyerSummary)}

Return JSON:
{"criteria":[{"name":"criterion name","category":"functional|technical|commercial|strategic|risk","weight":1-10,"reason":"why this matters based on past patterns"}],"constraints":[{"description":"constraint text","hardLimit":true|false,"reason":"based on pattern"}],"priorities":{"must_have":["priority"],"nice_to_have":["priority"]},"vendorCandidates":[{"name":"vendor","reason":"why suggested"}],"reasoning":"1-2 sentences on what past patterns informed these defaults"}`;

		case 'vendor_change_analyzer':
			return `Compare this vendor's previous and current enrichment data. Identify material changes that could affect an active evaluation.

Vendor: ${str(ctx.vendorName)}
Previous data: ${str(ctx.previousData)}
Current data: ${str(ctx.currentData)}
Project context: ${str(ctx.projectContext)}

Return JSON:
{"changeType":"pricing|features|market_position|leadership|stability|none","severity":"high|medium|low|none","summary":"1-2 sentence summary of what changed","recommendation":"what the evaluating team should do","details":[{"field":"what changed","before":"old value","after":"new value"}]}`;

		case 'negotiation_extract':
			return `Extract structured negotiation intelligence from this entry.

Vendor: ${str(ctx.vendorName)}
Category: ${str(ctx.category)}
Entry text: ${str(ctx.entryText)}

Return JSON:
{"openingPosition":"what was proposed","concessionsWon":["concession"],"leverageUsed":["leverage point"],"nextSteps":["next step"],"riskSignals":["risk signal"],"counterpartySignals":"what the vendor's behavior suggests","estimatedDiscount":"estimated discount achieved so far, if any"}`;

		case 'deal_debrief': {
			return `Synthesize lessons learned from this completed vendor evaluation.

Selected vendor: ${str(ctx.selectedVendor)}
Rationale: ${str(ctx.rationale)}
Actual cost vs quoted: ${str(ctx.costComparison)}
Timeline: ${str(ctx.timeline)}
Surprises: ${str(ctx.surprises)}

Full project intelligence is in the system context.

Return JSON:
{"lessonsSummary":"3-4 sentence synthesis of key learnings","whatWorked":["specific thing that worked well"],"whatDidnt":["specific thing that didn't work"],"surprises":["unexpected finding"],"recommendationsForNext":["actionable recommendation for future evaluations"],"vendorInsights":{"strengths":"confirmed strengths","concerns":"confirmed or new concerns","negotiationLearning":"what worked in negotiation"},"processInsights":{"timelineAccuracy":"was the timeline realistic?","criteriaEffectiveness":"did criteria predict the right outcome?","teamAlignment":"was the team aligned at decision time?"}}`;
		}

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
// Cross-Phase Project Intelligence (Phase 10A)
// ============================================================

/**
 * Loads full project data (SOLVE + Evaluate) and assembles a rich
 * intelligence context string. Injected into all project-scoped
 * engine calls so every AI response is aware of the full picture.
 */
async function buildProjectIntelligence(
	projectId: string,
	supabase: ReturnType<typeof createServerSupabase>
): Promise<string | null> {
	// Load the project with all state
	const { data: project } = await supabase
		.from('projects')
		.select('*')
		.eq('id', projectId)
		.single();

	if (!project) return null;

	const parts: string[] = ['=== PROJECT INTELLIGENCE ==='];

	// --- Core project info ---
	parts.push(`Project: ${project.name || 'Untitled'}`);
	if (project.category) parts.push(`Category: ${project.category}`);
	parts.push(`Phase: ${project.phase || 'define'} | Step: ${project.current_step || 'unknown'}`);
	parts.push(`Status: ${project.status || 'active'}`);

	// --- SOLVE Phase Intelligence ---
	const solve = project.solve_data as Record<string, unknown> | null;
	if (solve) {
		parts.push('\n--- DEFINE PHASE ---');

		// Triggers
		const triggers = arr(solve.triggers);
		if (triggers.length > 0) {
			const triggerLabels = triggers.map((t: any) => t.label || t.text || str(t)).filter(Boolean);
			if (triggerLabels.length) parts.push(`Purchase triggers: ${triggerLabels.join(', ')}`);
		}

		// Budget & timeline
		if (solve.budgetRange) parts.push(`Budget range: ${str(solve.budgetRange)}`);
		if (solve.timeline) parts.push(`Timeline: ${str(solve.timeline)}`);
		if (solve.urgency) parts.push(`Urgency: ${str(solve.urgency)}`);

		// Category
		if (solve.categoryDetected) {
			parts.push(`Detected category: ${str(solve.categoryDetected)} (confidence: ${str(solve.categoryConfidence)}%)`);
		}

		// Constraints (critical for cross-phase awareness)
		const constraints = arr(solve.constraints);
		if (constraints.length > 0) {
			const hardConstraints = constraints.filter((c: any) => c.hardLimit);
			const softConstraints = constraints.filter((c: any) => !c.hardLimit);
			if (hardConstraints.length > 0) {
				parts.push(`DEAL-BREAKER constraints: ${hardConstraints.map((c: any) => str(c.description)).join('; ')}`);
			}
			if (softConstraints.length > 0) {
				parts.push(`Soft constraints: ${softConstraints.map((c: any) => str(c.description)).join('; ')}`);
			}
		}

		// Priorities
		const priorities = solve.priorities as Record<string, unknown[]> | undefined;
		if (priorities) {
			const mustHave = arr(priorities.must_have).map((p: any) => str(p.label)).filter(Boolean);
			const niceToHave = arr(priorities.nice_to_have).map((p: any) => str(p.label)).filter(Boolean);
			if (mustHave.length) parts.push(`Must-have priorities: ${mustHave.join(', ')}`);
			if (niceToHave.length) parts.push(`Nice-to-have priorities: ${niceToHave.join(', ')}`);
		}

		// Stakeholders
		const stakeholders = arr(solve.stakeholders);
		if (stakeholders.length > 0) {
			const stakeStr = stakeholders.map((s: any) => `${s.name} (${s.role}, ${s.influence})`).join('; ');
			parts.push(`Key stakeholders: ${stakeStr}`);
		}

		// Problem brief
		if (solve.problemBrief) {
			const brief = str(solve.problemBrief);
			parts.push(`Problem brief: ${brief.slice(0, 500)}${brief.length > 500 ? '...' : ''}`);
		}

		// Discovered vendors & shortlist
		const discovered = arr(solve.discoveredVendors);
		const shortlisted = arr(solve.shortlistedVendorIds);
		if (discovered.length > 0) {
			parts.push(`Vendors discovered: ${discovered.length} | Shortlisted: ${shortlisted.length}`);
			const shortlistedVendors = discovered.filter((v: any) => shortlisted.includes(v.id));
			if (shortlistedVendors.length > 0) {
				parts.push(`Shortlisted: ${shortlistedVendors.map((v: any) => str(v.name)).join(', ')}`);
			}
		}

		// Knockout matrix violations
		const knockout = arr(solve.knockoutMatrix);
		const failures = knockout.filter((k: any) => k.pass === false);
		if (failures.length > 0) {
			parts.push(`⚠ Knockout failures: ${failures.map((k: any) => `${str(k.vendorId)} failed ${str(k.criterionId)}`).join('; ')}`);
		}

		// Challenge responses (validation signals)
		const challengeResponses = arr(solve.challengeResponses);
		if (challengeResponses.length > 0) {
			parts.push(`Challenge responses: ${challengeResponses.length} devil's advocate questions addressed`);
		}
	}

	// --- EVALUATE Phase Intelligence ---
	const state = project.state as Record<string, unknown> | null;
	if (state) {
		const vendors = arr(state.vendors);
		const criteria = arr(state.criteria);
		const scores = (state.scores ?? {}) as Record<string, Record<string, number>>;
		const weights = (state.weights ?? {}) as Record<string, number>;

		if (vendors.length > 0 || criteria.length > 0) {
			parts.push('\n--- EVALUATE PHASE ---');
		}

		// Criteria overview
		if (criteria.length > 0) {
			parts.push(`Evaluation criteria (${criteria.length}): ${criteria.map((c: any) => {
				const w = weights[c.id] ? ` [weight: ${(weights[c.id] * 10).toFixed(0)}/10]` : '';
				return `${str(c.name)}${w}`;
			}).join(', ')}`);
		}

		// Vendor scores summary
		if (vendors.length > 0) {
			parts.push(`Vendors in evaluation: ${vendors.length}`);
			for (const vendor of vendors) {
				const v = vendor as Record<string, unknown>;
				const vendorScores = scores[str(v.id)] ?? {};
				const scoreValues = Object.values(vendorScores).filter((s: any) => typeof s === 'number');
				const avgScore = scoreValues.length > 0
					? (scoreValues.reduce((a: number, b: any) => a + Number(b), 0) / scoreValues.length).toFixed(1)
					: 'not scored';
				const scoredCount = scoreValues.length;
				const totalCriteria = criteria.length;
				parts.push(`  • ${str(v.name)}: avg ${avgScore}/10, ${scoredCount}/${totalCriteria} criteria scored`);

				// Flag low scores on high-weight criteria
				if (scoredCount > 0) {
					for (const crit of criteria) {
						const c = crit as Record<string, unknown>;
						const critScore = vendorScores[str(c.id)];
						const critWeight = weights[str(c.id)] ?? 0.5;
						if (typeof critScore === 'number' && critScore <= 3 && critWeight >= 0.7) {
							parts.push(`    ⚠ LOW SCORE on high-priority "${str(c.name)}": ${critScore}/10`);
						}
					}
				}
			}
		}

		// Demo feedback signals
		if (state.demoFeedback || state.demos) {
			const demos = arr(state.demoFeedback ?? state.demos);
			if (demos.length > 0) {
				parts.push(`Demo feedback collected: ${demos.length} demos`);
				for (const demo of demos.slice(0, 3)) {
					const d = demo as Record<string, unknown>;
					if (d.vendorName && d.rating) {
						parts.push(`  • ${str(d.vendorName)}: ${str(d.rating)}/5 — ${str(d.summary || d.notes || '').slice(0, 100)}`);
					}
				}
			}
		}

		// Negotiation notes
		if (state.negotiations) {
			const negs = arr(state.negotiations);
			if (negs.length > 0) {
				parts.push(`Negotiation entries: ${negs.length}`);
				for (const neg of negs.slice(0, 3)) {
					const n = neg as Record<string, unknown>;
					parts.push(`  • ${str(n.vendorName || n.vendor)}: ${str(n.summary || n.notes || '').slice(0, 100)}`);
				}
			}
		}

		// TCO data
		if (state.tco) {
			const tco = state.tco as Record<string, unknown>;
			if (Object.keys(tco).length > 0) {
				parts.push(`TCO data available for ${Object.keys(tco).length} vendor(s)`);
			}
		}
	}

	// --- Alignment intelligence ---
	try {
		const { data: polls } = await supabase
			.from('alignment_polls')
			.select('id, title, status, context_type, poll_type')
			.eq('project_id', projectId)
			.order('created_at', { ascending: false })
			.limit(5);

		if (polls && polls.length > 0) {
			parts.push('\n--- TEAM ALIGNMENT ---');
			const active = polls.filter((p: any) => p.status === 'active');
			const closed = polls.filter((p: any) => p.status === 'closed');
			parts.push(`Polls: ${active.length} active, ${closed.length} closed`);
		}
	} catch {
		// alignment_polls table may not exist yet
	}

	// --- Activity signals ---
	try {
		const { data: activity } = await supabase
			.from('activity_log')
			.select('verb, detail, created_at')
			.eq('project_id', projectId)
			.order('created_at', { ascending: false })
			.limit(5);

		if (activity && activity.length > 0) {
			parts.push('\n--- RECENT ACTIVITY ---');
			for (const a of activity) {
				const act = a as Record<string, unknown>;
				parts.push(`  • ${str(act.verb)}: ${str(act.detail).slice(0, 80)} (${str(act.created_at).slice(0, 10)})`);
			}
		}
	} catch {
		// activity_log table may not exist yet
	}

	parts.push('=== END PROJECT INTELLIGENCE ===');
	parts.push('Use the above project context to cross-reference findings. Flag constraint violations, score inconsistencies, and alignment gaps. Reference specific project data in your analysis.');

	return parts.join('\n');
}

/**
 * Format project intelligence for injection into system prompt.
 */
function formatProjectIntelligence(intelligence: string | undefined): string {
	if (!intelligence) return '';
	return intelligence;
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
	if (profile.maturity) parts.push(`Purchase maturity: ${profile.maturity}`);
	if (profile.process) parts.push(`Decision process: ${profile.process}`);
	if (profile.typicalTimeline) parts.push(`Typical evaluation timeline: ${profile.typicalTimeline}`);
	if (profile.stakeholders) parts.push(`Key stakeholders: ${profile.stakeholders}`);
	if (profile.approvalWorkflow) parts.push(`Approval workflow: ${profile.approvalWorkflow}`);
	if (profile.compliance) parts.push(`Compliance requirements: ${arr(profile.compliance).join(', ')}`);
	if (profile.priorities) parts.push(`Organisational priorities: ${arr(profile.priorities).join(', ')}`);
	if (profile.vendorPref) parts.push(`Vendor tier preference: ${arr(profile.vendorPref).join(', ')}`);
	if (profile.regions) parts.push(`Operating regions: ${arr(profile.regions).join(', ')}`);
	if (profile.stack) parts.push(`Existing tech stack: ${profile.stack}`);
	if (profile.integrationReqs) parts.push(`Integration requirements: ${arr(profile.integrationReqs).join(', ')}`);
	if (profile.dealBreakers) parts.push(`Deal-breakers: ${arr(profile.dealBreakers).join(', ')}`);
	if (profile.painPoints) parts.push(`Key pain points: ${profile.painPoints}`);
	if (profile.successMetrics) parts.push(`Success metrics: ${profile.successMetrics}`);
	if (profile.pastVendorLessons) parts.push(`Past vendor lessons: ${profile.pastVendorLessons}`);
	if (profile.notes) parts.push(`Additional context: ${profile.notes}`);
	parts.push('=== END BUYER CONTEXT ===');
	parts.push('Tailor all analysis, suggestions, and recommendations to the above buyer profile. Factor in their deal-breakers, compliance needs, integration requirements, and past lessons when making any recommendation. Do not mention the context block in your response.');

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

/**
 * Validate AI output against expected schema shape.
 * Returns an array of error strings (empty = valid).
 */
function validateEngineOutput(
	data: unknown,
	schema: { required: string[]; type: 'object' | 'array' }
): string[] {
	const errors: string[] = [];

	if (schema.type === 'array') {
		if (!Array.isArray(data)) {
			errors.push(`Expected array, got ${typeof data}`);
			return errors;
		}
		if (data.length === 0) return errors; // Empty arrays are valid
		// Validate first item has required fields
		const firstItem = data[0];
		if (typeof firstItem === 'object' && firstItem !== null) {
			for (const key of schema.required) {
				if (!(key in firstItem)) {
					errors.push(`Array items missing required field: ${key}`);
				}
			}
		}
	} else {
		if (typeof data !== 'object' || data === null || Array.isArray(data)) {
			errors.push(`Expected object, got ${Array.isArray(data) ? 'array' : typeof data}`);
			return errors;
		}
		for (const key of schema.required) {
			if (!(key in data)) {
				errors.push(`Missing required field: ${key}`);
			}
		}
	}

	return errors;
}

/**
 * Semantic confidence scoring — replaces token-count-based heuristic.
 * Evaluates: model depth, output quality signals, validation status,
 * structural completeness, and response characteristics.
 */
function estimateConfidence(
	depth: EngineDepth,
	engine: string,
	result: unknown,
	meta: { validationPassed: boolean; attempts: number; outputTokens: number; latency: number }
): number {
	// Base confidence by model tier
	let score = depth === 'deep' ? 80 : depth === 'standard' ? 70 : 55;

	// Schema validation: strong positive/negative signal
	if (meta.validationPassed) {
		score += 8;
	} else {
		score -= 20;
	}

	// Retry penalty — needed retries indicates instability
	if (meta.attempts > 1) {
		score -= (meta.attempts - 1) * 10;
	}

	// Structural completeness — check how "filled out" the response is
	const completeness = measureCompleteness(result);
	score += Math.round(completeness * 12); // 0-12 points for completeness

	// Response length signal — very short responses may be low quality
	if (meta.outputTokens < 50 && engine !== 'alignment_summary') {
		score -= 10;
	}

	// Engine-specific quality adjustments
	const freeformEngines = ['executive_brief', 'context_notes'];
	if (freeformEngines.includes(engine) && typeof result === 'object' && result !== null) {
		const text = 'text' in result ? String((result as any).text) : '';
		if (text.length > 200) score += 5;
	}

	return Math.min(95, Math.max(15, score));
}

/**
 * Measure how "complete" an AI response is: ratio of non-null, non-empty values.
 */
function measureCompleteness(data: unknown): number {
	if (data === null || data === undefined) return 0;

	if (Array.isArray(data)) {
		if (data.length === 0) return 0.3;
		// Check first 3 items
		const samples = data.slice(0, 3);
		const scores = samples.map((item) => measureCompleteness(item));
		return scores.reduce((a, b) => a + b, 0) / scores.length;
	}

	if (typeof data === 'object') {
		const entries = Object.entries(data as Record<string, unknown>);
		if (entries.length === 0) return 0.2;
		const filled = entries.filter(([, v]) =>
			v !== null && v !== undefined && v !== '' &&
			!(Array.isArray(v) && v.length === 0)
		);
		return filled.length / entries.length;
	}

	if (typeof data === 'string') return data.length > 0 ? 0.8 : 0;
	return 0.5;
}
