import type {
  AppForCatalog,
  ApprovalMethod,
  Group,
  GroupingTagDefinition,
  Person,
  SubResource,
} from '@igstack/app-catalog-backend-core'

// ============================================================================
// TAG DEFINITIONS
// ============================================================================

export const mockTagDefinitions: GroupingTagDefinition[] = [
  {
    prefix: 'category',
    displayName: 'Category',
    description: 'Functional category of the application',
    values: [
      {
        value: 'communication',
        displayName: 'Communication',
        description: 'Team messaging, video calls, and communication tools',
      },
      {
        value: 'development',
        displayName: 'Development',
        description: 'Software development, version control, and DevOps tools',
      },
      {
        value: 'data-analytics',
        displayName: 'Data & Analytics',
        description:
          'Business intelligence, data visualization, and analytics platforms',
      },
      {
        value: 'hr',
        displayName: 'HR & Learning',
        description: 'Human resources, recruiting, and learning management',
      },
      {
        value: 'sales-marketing',
        displayName: 'Sales & Marketing',
        description: 'CRM, marketing automation, and sales enablement',
      },
      {
        value: 'finance',
        displayName: 'Finance & Legal',
        description: 'Financial management, accounting, and legal tools',
      },
      {
        value: 'security',
        displayName: 'Security & Infrastructure',
        description: 'Identity management, security, and cloud infrastructure',
      },
      {
        value: 'operations',
        displayName: 'Operations',
        description:
          'Project management, documentation, and productivity tools',
      },
    ],
  },
  {
    prefix: 'universality',
    displayName: 'Universality',
    description: 'How widely the application is used within the organization',
    values: [
      {
        value: 'everyone',
        displayName: 'Everyone',
        description: 'Used by all or nearly all employees',
      },
      {
        value: 'common',
        displayName: 'Common',
        description: 'Used by multiple teams or departments',
      },
      {
        value: 'specialized',
        displayName: 'Specialized',
        description: 'Used by specific teams or roles',
      },
    ],
  },
  {
    prefix: 'origin',
    displayName: 'Origin',
    description:
      'Whether the application is internally developed or externally provided',
    values: [
      {
        value: 'internal',
        displayName: 'Internal',
        description: 'Developed and maintained internally',
      },
      {
        value: 'external',
        displayName: 'External',
        description: 'Third-party SaaS or external service',
      },
    ],
  },
]

// ============================================================================
// APPROVAL METHODS
// ============================================================================

export const mockApprovalMethods: ApprovalMethod[] = [
  {
    slug: 'it-helpdesk',
    type: 'service',
    displayName: 'IT Helpdesk',
    config: {
      url: 'https://helpdesk.example.com',
      icon: 'jira',
    },
  },
  {
    slug: 'manager-approval',
    type: 'custom',
    displayName: 'Manager Approval',
    config: {},
  },
  {
    slug: 'self-service',
    type: 'custom',
    displayName: 'Self-Service',
    config: {},
  },
  {
    slug: 'security-team',
    type: 'custom',
    displayName: 'Security Team',
    config: {},
  },
  {
    slug: 'auto-provisioned',
    type: 'custom',
    displayName: 'Auto-Provisioned',
    config: {},
  },
]

// ============================================================================
// APPLICATION CATALOG
// ============================================================================

export const mockAppCatalog: AppForCatalog[] = [
  // COMMUNICATION & COLLABORATION
  {
    id: 'slack',
    slug: 'slack',
    displayName: 'Slack',
    abbreviation: 'Team Chat',
    description:
      'Team messaging platform for real-time communication, file sharing, and integrations with other business tools. Organize conversations into channels, send direct messages, and integrate with hundreds of apps.',
    teams: ['All Employees'],
    tags: [
      'category:communication',
      'universality:everyone',
      'origin:external',
    ],
    appUrl: 'https://yourcompany.slack.com',
    accessRequest: {
      approvalMethodSlug: 'auto-provisioned',
      requestPrompt: 'Slack is auto-provisioned for all employees',
      comments:
        'Contact IT if you need additional permissions or private channels.',
    },
    sources: ['https://slack.com/help'],
  },
  {
    id: 'zoom',
    slug: 'zoom',
    displayName: 'Zoom',
    description:
      'Video conferencing platform for meetings, webinars, and virtual events. Supports screen sharing, breakout rooms, recording, and integrations with calendar systems.',
    teams: ['All Employees'],
    tags: [
      'category:communication',
      'universality:everyone',
      'origin:external',
    ],
    appUrl: 'https://zoom.us',
    accessRequest: {
      approvalMethodSlug: 'auto-provisioned',
      requestPrompt: 'Zoom is auto-provisioned for all employees',
    },
    sources: ['https://support.zoom.us'],
  },
  {
    id: 'confluence',
    slug: 'confluence',
    displayName: 'Confluence',
    abbreviation: 'Wiki',
    description:
      'Team documentation and collaboration platform. Create, organize, and share documentation, project plans, meeting notes, and knowledge base articles in a searchable wiki format.',
    teams: ['Engineering', 'Product', 'Marketing'],
    tags: ['category:operations', 'universality:common', 'origin:external'],
    appUrl: 'https://yourcompany.atlassian.net/wiki',
    accessRequest: {
      approvalMethodSlug: 'it-helpdesk',
      requestPrompt: 'Can I get access to Confluence',
      roles: [
        {
          displayName: 'Viewer',
          description: 'Read-only access to all spaces',
        },
        { displayName: 'Editor', description: 'Can create and edit pages' },
        { displayName: 'Admin', description: 'Full administrative access' },
      ],
    },
    sources: ['https://confluence.atlassian.com/doc'],
  },

  // DEVELOPMENT & ENGINEERING
  {
    id: 'github',
    slug: 'github',
    displayName: 'GitHub',
    description:
      'Source code management and CI/CD platform. Version control using Git, code review via pull requests, automated workflows with GitHub Actions, issue tracking, and project management.',
    teams: ['Engineering', 'DevOps', 'Data Science'],
    tags: ['category:development', 'universality:common', 'origin:external'],
    appUrl: 'https://github.com/yourcompany',
    accessRequest: {
      approvalMethodSlug: 'manager-approval',
      requestPrompt: 'Can I get access to GitHub',
      roles: [
        { displayName: 'Read', description: 'Clone and view repositories' },
        {
          displayName: 'Write',
          description: 'Push to repositories and create PRs',
        },
        {
          displayName: 'Admin',
          description: 'Manage repository settings and permissions',
        },
      ],
      comments: 'Engineering manager approval required.',
    },
    sources: ['https://docs.github.com'],
  },
  {
    id: 'jira',
    slug: 'jira',
    displayName: 'Jira',
    description:
      'Issue tracking and project management platform. Track bugs, plan sprints, manage agile workflows, create custom boards, and generate reports on team velocity and progress.',
    teams: ['Engineering', 'Product', 'QA'],
    tags: ['category:development', 'universality:common', 'origin:external'],
    appUrl: 'https://yourcompany.atlassian.net/jira',
    accessRequest: {
      approvalMethodSlug: 'it-helpdesk',
      requestPrompt: 'Can I get access to Jira',
      roles: [
        { displayName: 'Viewer', description: 'View issues and boards' },
        { displayName: 'Developer', description: 'Create and edit issues' },
        {
          displayName: 'Project Admin',
          description: 'Manage project settings',
        },
      ],
    },
    sources: ['https://support.atlassian.com/jira'],
  },
  {
    id: 'datadog',
    slug: 'datadog',
    displayName: 'DataDog',
    description:
      'Monitoring and analytics platform for infrastructure, applications, and logs. Real-time observability with distributed tracing, APM, log aggregation, custom dashboards, and alerting.',
    teams: ['Engineering', 'DevOps', 'SRE'],
    tags: [
      'category:development',
      'universality:specialized',
      'origin:external',
    ],
    appUrl: 'https://app.datadoghq.com',
    accessRequest: {
      approvalMethodSlug: 'security-team',
      requestPrompt: 'Can I get access to DataDog',
      roles: [
        {
          displayName: 'Viewer',
          description: 'Read-only access to dashboards and metrics',
        },
        {
          displayName: 'Editor',
          description: 'Can create and modify dashboards and monitors',
        },
        { displayName: 'Admin', description: 'Full administrative access' },
      ],
      comments: 'Security team reviews all access requests.',
    },
    sources: ['https://docs.datadoghq.com'],
  },
  {
    id: 'pagerduty',
    slug: 'pagerduty',
    displayName: 'PagerDuty',
    description:
      'Incident management and on-call scheduling platform. Alert routing, escalation policies, incident response workflows, postmortem analysis, and integration with monitoring tools.',
    teams: ['Engineering', 'SRE', 'DevOps'],
    tags: [
      'category:development',
      'universality:specialized',
      'origin:external',
    ],
    appUrl: 'https://yourcompany.pagerduty.com',
    accessRequest: {
      approvalMethodSlug: 'manager-approval',
      requestPrompt: 'Can I get access to PagerDuty',
      comments: 'Required for on-call engineers. Manager approval needed.',
    },
    sources: ['https://support.pagerduty.com'],
  },
  {
    id: 'postman',
    slug: 'postman',
    displayName: 'Postman',
    description:
      'API development and testing platform. Design, test, and document APIs. Share collections, automate testing, mock servers, and collaborate on API development.',
    teams: ['Engineering', 'QA'],
    tags: ['category:development', 'universality:common', 'origin:external'],
    appUrl: 'https://www.postman.com',
    accessRequest: {
      approvalMethodSlug: 'self-service',
      requestPrompt: 'Sign up for Postman and join the company workspace',
    },
    sources: ['https://learning.postman.com'],
  },

  // DATA & ANALYTICS
  {
    id: 'tableau',
    slug: 'tableau',
    displayName: 'Tableau',
    description:
      'Business intelligence and data visualization platform. Create interactive dashboards, analyze data from multiple sources, and share insights across the organization.',
    teams: ['Data Analytics', 'Business Intelligence', 'Finance'],
    tags: ['category:data-analytics', 'universality:common', 'origin:external'],
    appUrl: 'https://tableau.yourcompany.com',
    accessRequest: {
      approvalMethodSlug: 'it-helpdesk',
      requestPrompt: 'Can I get access to Tableau',
      roles: [
        { displayName: 'Viewer', description: 'View published dashboards' },
        { displayName: 'Explorer', description: 'Edit and create new views' },
        {
          displayName: 'Creator',
          description: 'Full access to create and publish content',
        },
      ],
    },
    sources: ['https://help.tableau.com'],
  },
  {
    id: 'looker',
    slug: 'looker',
    displayName: 'Looker',
    description:
      'Data exploration and business intelligence platform. Explore data, create visualizations, build dashboards, and schedule reports. Integrates with data warehouses.',
    teams: ['Data Analytics', 'Engineering', 'Product'],
    tags: ['category:data-analytics', 'universality:common', 'origin:external'],
    appUrl: 'https://looker.yourcompany.com',
    accessRequest: {
      approvalMethodSlug: 'manager-approval',
      requestPrompt: 'Can I get access to Looker',
      comments: 'Manager approval required due to access to sensitive data.',
    },
    sources: ['https://cloud.google.com/looker/docs'],
  },
  {
    id: 'snowflake',
    slug: 'snowflake',
    displayName: 'Snowflake',
    description:
      'Cloud data warehouse platform. Store and analyze large volumes of data with SQL-based queries. Supports data sharing, time travel, and integration with BI tools.',
    teams: ['Data Engineering', 'Data Science', 'Analytics'],
    tags: [
      'category:data-analytics',
      'universality:specialized',
      'origin:external',
    ],
    appUrl: 'https://app.snowflake.com',
    accessRequest: {
      approvalMethodSlug: 'security-team',
      requestPrompt: 'Can I get access to Snowflake',
      roles: [
        {
          displayName: 'Reader',
          description: 'Read-only access to specific databases',
        },
        { displayName: 'Analyst', description: 'Query and analyze data' },
        {
          displayName: 'Developer',
          description: 'Create and modify database objects',
        },
      ],
      comments: 'Security review required for all access requests.',
    },
    sources: ['https://docs.snowflake.com'],
  },

  // HR & OPERATIONS
  {
    id: 'workday',
    slug: 'workday',
    displayName: 'Workday',
    abbreviation: 'HR System',
    description:
      'Enterprise HR management and payroll system. Manage employee records, compensation, benefits, time off, performance reviews, and organizational structure.',
    teams: ['All Employees'],
    tags: ['category:hr', 'universality:everyone', 'origin:external'],
    appUrl: 'https://workday.yourcompany.com',
    accessRequest: {
      approvalMethodSlug: 'auto-provisioned',
      requestPrompt: 'Workday is auto-provisioned for all employees',
      comments: 'All employees have self-service access to their own records.',
    },
    sources: ['https://doc.workday.com'],
  },
  {
    id: 'bamboohr',
    slug: 'bamboohr',
    displayName: 'BambooHR',
    description:
      'Employee records and time off management platform. Track PTO, manage employee information, onboarding workflows, and generate HR reports.',
    teams: ['Human Resources', 'All Employees'],
    tags: ['category:hr', 'universality:everyone', 'origin:external'],
    appUrl: 'https://yourcompany.bamboohr.com',
    accessRequest: {
      approvalMethodSlug: 'auto-provisioned',
      requestPrompt: 'BambooHR is auto-provisioned for all employees',
    },
    sources: ['https://help.bamboohr.com'],
  },
  {
    id: 'greenhouse',
    slug: 'greenhouse',
    displayName: 'Greenhouse',
    abbreviation: 'ATS',
    description:
      'Applicant tracking system for recruiting and hiring. Manage job postings, track candidates through hiring pipeline, schedule interviews, and collect feedback.',
    teams: ['Recruiting', 'Hiring Managers'],
    tags: ['category:hr', 'universality:common', 'origin:external'],
    appUrl: 'https://app.greenhouse.io',
    accessRequest: {
      approvalMethodSlug: 'it-helpdesk',
      requestPrompt: 'Can I get access to Greenhouse',
      roles: [
        {
          displayName: 'Interviewer',
          description: 'Submit interview feedback',
        },
        {
          displayName: 'Hiring Manager',
          description: 'Manage job openings and candidates',
        },
        { displayName: 'Admin', description: 'Full system access' },
      ],
    },
    sources: ['https://support.greenhouse.io'],
  },
  {
    id: 'expensify',
    slug: 'expensify',
    displayName: 'Expensify',
    description:
      'Expense reporting and reimbursement platform. Submit expenses, scan receipts, track mileage, and automate approval workflows.',
    teams: ['All Employees'],
    tags: ['category:finance', 'universality:everyone', 'origin:external'],
    appUrl: 'https://www.expensify.com',
    accessRequest: {
      approvalMethodSlug: 'auto-provisioned',
      requestPrompt: 'Expensify is auto-provisioned for all employees',
    },
    sources: ['https://help.expensify.com'],
  },

  // SALES & MARKETING
  {
    id: 'salesforce',
    slug: 'salesforce',
    displayName: 'Salesforce',
    abbreviation: 'CRM',
    description:
      'Customer relationship management platform. Manage leads, opportunities, accounts, contacts, and sales pipelines. Automate workflows and generate sales forecasts.',
    teams: ['Sales', 'Customer Success', 'Marketing'],
    tags: [
      'category:sales-marketing',
      'universality:common',
      'origin:external',
    ],
    appUrl: 'https://yourcompany.salesforce.com',
    accessRequest: {
      approvalMethodSlug: 'manager-approval',
      requestPrompt: 'Can I get access to Salesforce',
      roles: [
        { displayName: 'Read Only', description: 'View records only' },
        {
          displayName: 'Sales User',
          description: 'Manage leads and opportunities',
        },
        {
          displayName: 'Marketing User',
          description: 'Manage campaigns and leads',
        },
      ],
      comments: 'Sales or Marketing manager approval required.',
    },
    sources: ['https://help.salesforce.com'],
  },
  {
    id: 'hubspot',
    slug: 'hubspot',
    displayName: 'HubSpot',
    description:
      'Marketing automation and CRM platform. Manage email campaigns, track website visitors, score leads, automate marketing workflows, and analyze campaign performance.',
    teams: ['Marketing', 'Sales'],
    tags: [
      'category:sales-marketing',
      'universality:common',
      'origin:external',
    ],
    appUrl: 'https://app.hubspot.com',
    accessRequest: {
      approvalMethodSlug: 'it-helpdesk',
      requestPrompt: 'Can I get access to HubSpot',
    },
    sources: ['https://knowledge.hubspot.com'],
  },
  {
    id: 'gong',
    slug: 'gong',
    displayName: 'Gong',
    description:
      'Sales conversation intelligence platform. Record, transcribe, and analyze sales calls and meetings. Extract insights, coach reps, and improve win rates.',
    teams: ['Sales', 'Sales Leadership'],
    tags: [
      'category:sales-marketing',
      'universality:specialized',
      'origin:external',
    ],
    appUrl: 'https://app.gong.io',
    accessRequest: {
      approvalMethodSlug: 'manager-approval',
      requestPrompt: 'Can I get access to Gong',
      comments: 'Sales manager approval required.',
    },
    sources: ['https://help.gong.io'],
  },

  // FINANCE & LEGAL
  {
    id: 'netsuite',
    slug: 'netsuite',
    displayName: 'NetSuite',
    abbreviation: 'ERP',
    description:
      'Financial management and ERP system. Manage accounting, financial reporting, budgeting, procurement, inventory, and order management.',
    teams: ['Finance', 'Accounting', 'Operations'],
    tags: ['category:finance', 'universality:specialized', 'origin:external'],
    appUrl: 'https://system.netsuite.com',
    accessRequest: {
      approvalMethodSlug: 'security-team',
      requestPrompt: 'Can I get access to NetSuite',
      roles: [
        { displayName: 'Viewer', description: 'Read-only access to reports' },
        { displayName: 'Accountant', description: 'Record transactions' },
        { displayName: 'Admin', description: 'Full system access' },
      ],
      comments: 'Security team approval required for all access.',
    },
    sources: ['https://docs.oracle.com/en/cloud/saas/netsuite'],
  },
  {
    id: 'bill-com',
    slug: 'bill-com',
    displayName: 'Bill.com',
    description:
      'Accounts payable automation platform. Manage vendor payments, approve invoices, automate payment workflows, and sync with accounting systems.',
    teams: ['Finance', 'Accounting', 'Accounts Payable'],
    tags: ['category:finance', 'universality:specialized', 'origin:external'],
    appUrl: 'https://app.bill.com',
    accessRequest: {
      approvalMethodSlug: 'manager-approval',
      requestPrompt: 'Can I get access to Bill.com',
      comments: 'Finance manager approval required.',
    },
    sources: ['https://help.bill.com'],
  },
  {
    id: 'docusign',
    slug: 'docusign',
    displayName: 'DocuSign',
    description:
      'Electronic signature platform. Send, sign, and manage digital documents and contracts. Automate signature workflows and maintain audit trails.',
    teams: ['Legal', 'Sales', 'HR'],
    tags: ['category:finance', 'universality:common', 'origin:external'],
    appUrl: 'https://app.docusign.com',
    accessRequest: {
      approvalMethodSlug: 'it-helpdesk',
      requestPrompt: 'Can I get access to DocuSign',
      roles: [
        { displayName: 'Sender', description: 'Send documents for signature' },
        { displayName: 'Admin', description: 'Manage account and users' },
      ],
    },
    sources: ['https://support.docusign.com'],
  },

  // SECURITY & INFRASTRUCTURE
  {
    id: 'okta',
    slug: 'okta',
    displayName: 'Okta',
    abbreviation: 'SSO',
    description:
      'Identity and access management platform. Single sign-on (SSO) for all applications, multi-factor authentication (MFA), user provisioning, and access policies.',
    teams: ['All Employees'],
    tags: ['category:security', 'universality:everyone', 'origin:external'],
    appUrl: 'https://yourcompany.okta.com',
    accessRequest: {
      approvalMethodSlug: 'auto-provisioned',
      requestPrompt: 'Okta is auto-provisioned for all employees',
      comments: 'All employees receive Okta credentials on their first day.',
    },
    sources: ['https://help.okta.com'],
    tiers: [
      {
        tierSlug: 'prod',
        displayName: 'Okta Production',
        appUrl: 'https://yourcompany.okta.com',
        accessRequest: {
          approvalMethodSlug: 'auto-provisioned',
        },
      },
      {
        tierSlug: 'dev',
        displayName: 'Okta Preview',
        description: 'Testing environment for Okta',
        appUrl: 'https://yourcompany.oktapreview.com',
        accessRequest: {
          approvalMethodSlug: 'security-team',
          comments: 'Admin access to preview requires security team approval',
        },
      },
    ],
  },
  {
    id: 'aws-console',
    slug: 'aws-console',
    displayName: 'AWS Console',
    abbreviation: 'AWS',
    description:
      'Amazon Web Services cloud infrastructure management console. Manage compute, storage, databases, networking, and other cloud resources.',
    teams: ['Engineering', 'DevOps', 'SRE'],
    tags: ['category:security', 'universality:specialized', 'origin:external'],
    appUrl: 'https://console.aws.amazon.com',
    accessRequest: {
      approvalMethodSlug: 'security-team',
      requestPrompt: 'Can I get access to AWS Console',
      roles: [
        {
          displayName: 'ReadOnly',
          description: 'View-only access to resources',
        },
        {
          displayName: 'Developer',
          description: 'Deploy and manage applications',
        },
        { displayName: 'Admin', description: 'Full administrative access' },
      ],
      comments:
        'Security team review required. Must complete AWS security training first.',
    },
    sources: ['https://docs.aws.amazon.com'],
  },

  // PRODUCTIVITY & TOOLS
  {
    id: 'google-workspace',
    slug: 'google-workspace',
    displayName: 'Google Workspace',
    abbreviation: 'Gmail',
    description:
      'Email and productivity suite. Includes Gmail, Google Drive, Calendar, Docs, Sheets, Slides, and Meet. Collaborate on documents in real-time.',
    teams: ['All Employees'],
    tags: ['category:operations', 'universality:everyone', 'origin:external'],
    appUrl: 'https://workspace.google.com',
    accessRequest: {
      approvalMethodSlug: 'auto-provisioned',
      requestPrompt: 'Google Workspace is auto-provisioned for all employees',
    },
    sources: ['https://support.google.com/a'],
  },
  {
    id: 'notion',
    slug: 'notion',
    displayName: 'Notion',
    description:
      'Collaborative workspace and note-taking platform. Create documents, wikis, databases, and project boards. Organize information and collaborate with teams.',
    teams: ['Product', 'Engineering', 'Marketing'],
    tags: ['category:operations', 'universality:common', 'origin:external'],
    appUrl: 'https://notion.so',
    accessRequest: {
      approvalMethodSlug: 'self-service',
      requestPrompt:
        'Sign up with your work email and request to join the workspace',
    },
    sources: ['https://www.notion.so/help'],
  },
]

// ============================================================================
// PERSONS
// ============================================================================

export const mockPersons: Person[] = [
  {
    slug: 'jsmith@example.com',
    firstName: 'John',
    lastName: 'Smith',
    email: 'jsmith@example.com',
  },
  {
    slug: 'ajones@example.com',
    firstName: 'Alice',
    lastName: 'Jones',
    email: 'ajones@example.com',
  },
  {
    slug: 'bwilson@example.com',
    firstName: 'Bob',
    lastName: 'Wilson',
    email: 'bwilson@example.com',
  },
]

// ============================================================================
// GROUPS
// ============================================================================

export const mockGroups: Group[] = [
  {
    slug: 'cloud-team',
    displayName: 'Cloud Infrastructure Team',
    email: 'cloud-team@example.com',
    memberSlugs: ['jsmith@example.com', 'ajones@example.com'],
  },
  {
    slug: 'data-team',
    displayName: 'Data Engineering Team',
    memberSlugs: ['bwilson@example.com'],
  },
]

// ============================================================================
// SUB-RESOURCES (AWS accounts)
// ============================================================================

export const mockSubResources: SubResource[] = [
  {
    slug: 'aws-prod-main',
    displayName: 'company-prod-main',
    description: 'Main production AWS account',
    appSlug: 'aws-console',
    familySlug: 'company-main',
    tierSlug: 'prod',
    aliases: ['123456789012'],
    ownerPersonSlug: 'jsmith@example.com',
    accessMaintainerGroupSlugs: ['cloud-team'],
    extra: { orgUnit: 'Engineering', accounting: 'OpEx' },
  },
  {
    slug: 'aws-dev-main',
    displayName: 'company-dev-main',
    description: 'Main development AWS account',
    appSlug: 'aws-console',
    familySlug: 'company-main',
    tierSlug: 'dev',
    aliases: ['987654321098'],
    ownerPersonSlug: 'jsmith@example.com',
    accessMaintainerGroupSlugs: ['cloud-team'],
    extra: { orgUnit: 'Engineering', accounting: 'RnD' },
  },
  {
    slug: 'aws-data-analytics-prod',
    displayName: 'company-data-analytics-prod',
    description: 'Data analytics production account',
    appSlug: 'aws-console',
    familySlug: 'company-data-analytics',
    tierSlug: 'prod',
    aliases: ['111222333444'],
    ownerPersonSlug: 'bwilson@example.com',
    accessMaintainerGroupSlugs: ['data-team'],
    extra: { orgUnit: 'Data', accounting: 'OpEx' },
  },
]
