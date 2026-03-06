/**
 * Prompt Banks — Static suggestion templates for all major decision points.
 * Matching the prototype's PROMPT_BANKS constant.
 * These serve as the fallback layer when AI is disabled or unavailable.
 */

// ============================================================
// Problem Statement Templates
// ============================================================
export const PROBLEM_TEMPLATES: Record<string, string[]> = {
	growth: [
		'We\'re scaling from {current} to {target} users and our current {tool} can\'t keep up with the volume.',
		'Our team has grown {x}% in the last year and we need a {category} solution that supports multi-team collaboration at scale.',
		'We\'re expanding into {market} and need a {category} platform that supports international operations.',
	],
	compliance: [
		'We need to achieve {framework} compliance within {timeframe} and our current tools don\'t meet the requirements.',
		'An audit flagged gaps in our {area} processes — we need a compliant {category} solution urgently.',
		'New regulations require us to {requirement}, and our existing setup can\'t handle it.',
	],
	cost: [
		'We\'re spending ${amount}/year on {current tool} and leadership wants to cut costs by {x}% without losing functionality.',
		'Our {category} costs have grown {x}% year-over-year and we need to renegotiate or replace.',
		'We\'re consolidating {count} tools into one platform to reduce total cost of ownership.',
	],
	replacement: [
		'Our contract with {vendor} expires in {timeframe} and we want to evaluate alternatives before auto-renewal.',
		'{Current tool} hasn\'t kept pace with our needs — specifically around {gap1} and {gap2}.',
		'We\'ve outgrown {current tool} and need something that handles {requirement} natively.',
	],
	newcap: [
		'We don\'t currently have a {category} solution and need to implement one to support {initiative}.',
		'The team has been using spreadsheets/manual processes for {process} and it\'s become unsustainable.',
		'We\'re launching {initiative} and need {category} capabilities we\'ve never had before.',
	],
};

// ============================================================
// Cost of Inaction Templates
// ============================================================
export const COST_OF_INACTION: string[] = [
	'Every month we delay, we lose approximately ${amount} in {productivity/revenue/efficiency}.',
	'Our team spends {hours} hours/week on manual workarounds that a proper solution would eliminate.',
	'We risk {compliance_event} if we don\'t address this within {timeframe}, with potential fines of ${amount}.',
	'Competitor {name} already uses {category} tools — every quarter we wait, we fall further behind.',
	'Staff frustration with current tools is driving turnover — we\'ve lost {count} people citing tooling issues.',
];

// ============================================================
// Success Criteria Templates
// ============================================================
export const SUCCESS_CRITERIA: string[] = [
	'Reduce {metric} processing time from {current} to {target} within 90 days of go-live.',
	'Achieve {x}% user adoption across {team/department} within the first 60 days.',
	'Eliminate {count} manual steps in our {process} workflow.',
	'Pass {compliance framework} audit with zero critical findings within 6 months.',
	'Consolidate from {count} tools to 1 platform with no loss of critical functionality.',
];

// ============================================================
// Category-Specific Criteria (weighted, matching prototype)
// ============================================================
export interface CriterionTemplate {
	n: string;
	w: number;
	cat?: string;
}

export const CRITERIA_BANKS: Record<string, CriterionTemplate[]> = {
	crm: [
		{ n: 'Core CRM Features', w: 28, cat: 'functional' },
		{ n: 'Ease of Use & Adoption', w: 18, cat: 'functional' },
		{ n: 'Reporting & Analytics', w: 15, cat: 'functional' },
		{ n: 'Integration Ecosystem', w: 14, cat: 'technical' },
		{ n: 'Security & Compliance', w: 12, cat: 'risk' },
		{ n: 'Pricing & Value', w: 13, cat: 'commercial' },
	],
	hris: [
		{ n: 'Core HR & Payroll', w: 25, cat: 'functional' },
		{ n: 'Employee Self-Service', w: 18, cat: 'functional' },
		{ n: 'Compliance & Reporting', w: 20, cat: 'risk' },
		{ n: 'Benefits Administration', w: 15, cat: 'functional' },
		{ n: 'Integration & Data', w: 10, cat: 'technical' },
		{ n: 'Cost & Scalability', w: 12, cat: 'commercial' },
	],
	project: [
		{ n: 'Task & Project Management', w: 25, cat: 'functional' },
		{ n: 'Collaboration Features', w: 20, cat: 'functional' },
		{ n: 'Reporting & Visibility', w: 15, cat: 'functional' },
		{ n: 'Customizability', w: 15, cat: 'technical' },
		{ n: 'Integrations', w: 13, cat: 'technical' },
		{ n: 'Pricing', w: 12, cat: 'commercial' },
	],
	finance: [
		{ n: 'Accounting & GL', w: 25, cat: 'functional' },
		{ n: 'AP/AR Automation', w: 20, cat: 'functional' },
		{ n: 'Compliance & Audit Trail', w: 18, cat: 'risk' },
		{ n: 'Reporting & Dashboards', w: 15, cat: 'functional' },
		{ n: 'Multi-entity Support', w: 10, cat: 'technical' },
		{ n: 'Integration & Scalability', w: 12, cat: 'technical' },
	],
	marketing: [
		{ n: 'Campaign Management', w: 22, cat: 'functional' },
		{ n: 'Marketing Automation', w: 20, cat: 'functional' },
		{ n: 'Analytics & Attribution', w: 18, cat: 'functional' },
		{ n: 'Content & Creative Tools', w: 15, cat: 'functional' },
		{ n: 'Integration Ecosystem', w: 13, cat: 'technical' },
		{ n: 'Pricing & ROI', w: 12, cat: 'commercial' },
	],
	support: [
		{ n: 'Ticket Management', w: 25, cat: 'functional' },
		{ n: 'Self-Service & Knowledge Base', w: 18, cat: 'functional' },
		{ n: 'Omnichannel Support', w: 17, cat: 'functional' },
		{ n: 'Reporting & SLA Tracking', w: 15, cat: 'functional' },
		{ n: 'AI & Automation', w: 13, cat: 'technical' },
		{ n: 'Pricing & Scalability', w: 12, cat: 'commercial' },
	],
	data: [
		{ n: 'Data Visualization', w: 22, cat: 'functional' },
		{ n: 'Data Connectivity', w: 20, cat: 'technical' },
		{ n: 'Self-Service Analytics', w: 18, cat: 'functional' },
		{ n: 'Governance & Security', w: 15, cat: 'risk' },
		{ n: 'Scalability & Performance', w: 13, cat: 'technical' },
		{ n: 'Cost & Licensing', w: 12, cat: 'commercial' },
	],
	devtools: [
		{ n: 'Core Development Features', w: 25, cat: 'functional' },
		{ n: 'CI/CD & Automation', w: 20, cat: 'technical' },
		{ n: 'Security & Compliance', w: 18, cat: 'risk' },
		{ n: 'Scalability', w: 15, cat: 'technical' },
		{ n: 'Developer Experience', w: 12, cat: 'functional' },
		{ n: 'Pricing', w: 10, cat: 'commercial' },
	],
	collab: [
		{ n: 'Messaging & Communication', w: 22, cat: 'functional' },
		{ n: 'File Sharing & Storage', w: 18, cat: 'functional' },
		{ n: 'Video & Meetings', w: 17, cat: 'functional' },
		{ n: 'Integration Ecosystem', w: 18, cat: 'technical' },
		{ n: 'Security & Admin', w: 13, cat: 'risk' },
		{ n: 'Pricing', w: 12, cat: 'commercial' },
	],
	security: [
		{ n: 'Threat Detection & Response', w: 25, cat: 'functional' },
		{ n: 'Compliance & Audit', w: 22, cat: 'risk' },
		{ n: 'Identity & Access Management', w: 18, cat: 'functional' },
		{ n: 'Integration & Deployment', w: 15, cat: 'technical' },
		{ n: 'Reporting & Visibility', w: 10, cat: 'functional' },
		{ n: 'Pricing & Support', w: 10, cat: 'commercial' },
	],
	ecommerce: [
		{ n: 'Storefront & Catalog', w: 22, cat: 'functional' },
		{ n: 'Checkout & Payments', w: 20, cat: 'functional' },
		{ n: 'Order Management', w: 18, cat: 'functional' },
		{ n: 'Marketing & SEO', w: 15, cat: 'functional' },
		{ n: 'Scalability & Performance', w: 13, cat: 'technical' },
		{ n: 'Pricing & Fees', w: 12, cat: 'commercial' },
	],
	ops: [
		{ n: 'Workflow Automation', w: 25, cat: 'functional' },
		{ n: 'Integration Breadth', w: 22, cat: 'technical' },
		{ n: 'Ease of Use', w: 18, cat: 'functional' },
		{ n: 'Monitoring & Alerts', w: 15, cat: 'functional' },
		{ n: 'Scalability', w: 10, cat: 'technical' },
		{ n: 'Pricing', w: 10, cat: 'commercial' },
	],
};

// ============================================================
// Category-Specific Vendors (static fallbacks)
// ============================================================
export const VENDOR_BANKS: Record<string, string[]> = {
	crm: ['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho CRM', 'Freshsales', 'Close'],
	hris: ['Rippling', 'Workday', 'BambooHR', 'Gusto', 'ADP Workforce Now', 'Paylocity'],
	project: ['Asana', 'Monday.com', 'Jira', 'ClickUp', 'Linear', 'Notion'],
	finance: ['NetSuite', 'Sage Intacct', 'QuickBooks', 'Xero', 'FreshBooks', 'Bill.com'],
	marketing: ['HubSpot Marketing', 'Marketo', 'Mailchimp', 'ActiveCampaign', 'Pardot', 'Klaviyo'],
	support: ['Zendesk', 'Intercom', 'Freshdesk', 'ServiceNow', 'Help Scout', 'Zoho Desk'],
	data: ['Tableau', 'Looker', 'Power BI', 'Metabase', 'Sisense', 'Domo'],
	devtools: ['GitHub', 'GitLab', 'Bitbucket', 'CircleCI', 'Vercel', 'Datadog'],
	collab: ['Slack', 'Microsoft Teams', 'Zoom', 'Notion', 'Google Workspace', 'Miro'],
	security: ['CrowdStrike', 'Okta', 'Palo Alto Networks', 'Zscaler', 'SentinelOne', 'Wiz'],
	ecommerce: ['Shopify', 'BigCommerce', 'WooCommerce', 'Magento', 'Salesforce Commerce', 'Squarespace'],
	ops: ['Zapier', 'Make', 'Workato', 'Tray.io', 'Power Automate', 'n8n'],
};

// ============================================================
// Category-Specific Workflow Stages
// ============================================================
export const WORKFLOW_BANKS: Record<string, string[]> = {
	crm: ['Initial Discovery', 'Vendor Demos', 'Free Trial / Sandbox', 'Pricing Negotiation', 'Security Review', 'Decision'],
	hris: ['Requirements Gathering', 'Vendor Shortlist', 'Demo & Q&A', 'Compliance Check', 'Pricing & Contract', 'Decision'],
	project: ['Team Needs Assessment', 'Vendor Research', 'Trial Period', 'Team Feedback', 'Pricing Comparison', 'Decision'],
	finance: ['Audit Requirements', 'Vendor Demos', 'Data Migration Assessment', 'Compliance Review', 'Contract Negotiation', 'Decision'],
	marketing: ['Marketing Stack Audit', 'Vendor Demos', 'Integration Testing', 'ROI Modeling', 'Contract Review', 'Decision'],
	support: ['Support Needs Analysis', 'Vendor Demos', 'Agent Trial', 'Customer Impact Assessment', 'Pricing Review', 'Decision'],
	data: ['Data Requirements', 'Vendor Demos', 'POC / Data Connection Test', 'Performance Benchmarks', 'Licensing Review', 'Decision'],
	devtools: ['Technical Requirements', 'Vendor Evaluation', 'POC / Integration Test', 'Security & Compliance', 'Licensing', 'Decision'],
	collab: ['Team Survey', 'Vendor Demos', 'Pilot Group Trial', 'Adoption Assessment', 'Pricing Review', 'Decision'],
	security: ['Threat Assessment', 'Vendor Evaluation', 'POC / Pen Test', 'Compliance Mapping', 'Contract & SLA', 'Decision'],
	ecommerce: ['Business Requirements', 'Platform Demos', 'Theme / Customization POC', 'Payment Integration Test', 'Pricing', 'Decision'],
	ops: ['Process Mapping', 'Vendor Demos', 'Integration POC', 'Scale Testing', 'Pricing Comparison', 'Decision'],
};

// ============================================================
// Demo Question Banks (by category)
// ============================================================
export const DEMO_QUESTION_BANKS: Record<string, string[]> = {
	crm: [
		'Walk me through your typical deal cycle management.',
		'How does your reporting handle custom objects and fields?',
		'What does your mobile experience look like for field reps?',
		'How do you handle data deduplication and cleanup?',
		'What integrations do you offer out of the box?',
	],
	hris: [
		'Show me the employee onboarding workflow end to end.',
		'How do you handle multi-state or multi-country payroll?',
		'What compliance reports are available out of the box?',
		'How do employees request and manage PTO?',
		'Walk me through your benefits enrollment process.',
	],
	project: [
		'How do you handle cross-team dependencies?',
		'Show me your resource allocation and capacity planning.',
		'How flexible are your custom workflows and automations?',
		'What reporting do you offer for leadership visibility?',
		'How does the tool handle different methodologies (Agile, Waterfall)?',
	],
	finance: [
		'Walk me through your month-end close process.',
		'How do you handle multi-entity consolidation?',
		'What audit trail and compliance features do you offer?',
		'How does AP automation work with approval workflows?',
		'Show me your revenue recognition capabilities.',
	],
	default: [
		'What does a typical implementation timeline look like?',
		'How do you handle data migration from our current tool?',
		'What training and onboarding support do you provide?',
		'Walk me through your security and compliance certifications.',
		'What does your customer support model look like?',
	],
};

// ============================================================
// Claims to Verify Banks
// ============================================================
export const CLAIMS_BANKS: Record<string, string[]> = {
	crm: [
		'Implementation takes [X weeks] — get this in the SOW',
		'Price lock for [N] years if we sign annual',
		'Data migration from [tool] is "straightforward"',
		'API rate limits are "generous enough"',
		'Custom objects are "unlimited" on this tier',
	],
	hris: [
		'Payroll processing is "same-day"',
		'Compliance updates are "automatic"',
		'Data migration from [tool] takes [X days]',
		'Employee self-service "covers 90% of HR requests"',
		'Benefits integration is "turnkey"',
	],
	default: [
		'Implementation timeline of [X] weeks is realistic',
		'No additional costs beyond the quoted price',
		'Data migration is included in the contract',
		'Support response time of [X] hours guaranteed',
		'All features shown in demo are in our tier',
	],
};

// ============================================================
// Negotiation Item Banks
// ============================================================
export const NEGOTIATION_BANKS: Record<string, string[]> = {
	crm: ['Volume discount', 'Implementation included', 'Extended trial', 'Premium support upgrade', 'Data migration included'],
	hris: ['Multi-year discount', 'Implementation & training included', 'Compliance audit support', 'Payroll setup fee waived', 'Premium support'],
	default: ['Multi-year discount', 'Implementation included', 'Training seats included', 'Premium support at standard tier', 'Data migration assistance'],
};

// ============================================================
// Priorities Banks (Must / Nice / Bonus)
// ============================================================
export const PRIORITIES_BANKS: Record<string, { must: string[]; nice: string[]; bonus: string[] }> = {
	crm: {
		must: ['Contact & deal management', 'Email integration', 'Pipeline reporting', 'Mobile access', 'Data import'],
		nice: ['Marketing automation', 'AI-powered insights', 'Custom dashboards', 'Territory management'],
		bonus: ['Social selling', 'Revenue intelligence', 'Conversation intelligence'],
	},
	hris: {
		must: ['Payroll processing', 'Employee records', 'PTO management', 'Compliance reporting', 'Onboarding'],
		nice: ['Benefits administration', 'Performance reviews', 'Workforce analytics', 'Learning management'],
		bonus: ['AI-powered insights', 'Compensation benchmarking', 'Succession planning'],
	},
	default: {
		must: ['Core functionality', 'Data security', 'Integration with existing tools', 'Reliable support', 'User-friendly interface'],
		nice: ['Advanced analytics', 'Automation features', 'Mobile access', 'Customization options'],
		bonus: ['AI-powered features', 'Industry-specific templates', 'White-glove onboarding'],
	},
};

// ============================================================
// Utility: Get bank key from category label
// ============================================================
export function getBankKey(categoryLabel: string): string {
	const map: Record<string, string> = {
		'CRM': 'crm',
		'HRIS / HCM': 'hris',
		'Project Management': 'project',
		'Finance / ERP': 'finance',
		'Marketing Automation': 'marketing',
		'Customer Support': 'support',
		'Data & Analytics': 'data',
		'DevTools / Cloud': 'devtools',
		'Collaboration': 'collab',
		'Security & Compliance': 'security',
		'eCommerce': 'ecommerce',
		'Operations / Automation': 'ops',
	};

	for (const [key, value] of Object.entries(map)) {
		if (categoryLabel.toLowerCase().includes(value) || categoryLabel.includes(key)) {
			return value;
		}
	}
	return 'default';
}

// ============================================================
// Get templates for a bank
// ============================================================
export function getBank<T>(bank: Record<string, T>, category: string): T {
	const key = getBankKey(category);
	return bank[key] ?? bank.default ?? Object.values(bank)[0];
}
