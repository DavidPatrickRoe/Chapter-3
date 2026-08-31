import { Client, TeamMember } from '../types';

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'mj',
    name: 'MJ Leslie',
    email: 'mj@chapter3.ca',
    role: 'Admin',
    title: 'Principal Consultant',
    avatarColor: 'from-sky-500 to-indigo-600',
    initials: 'MJ'
  },
  {
    id: 'david',
    name: 'David Roe',
    email: 'david@chapter3.ca',
    role: 'Admin',
    title: 'Director of Business Operations',
    avatarColor: 'from-teal-500 to-emerald-700',
    initials: 'DR'
  },
  {
    id: 'megan',
    name: 'Megan Savary',
    email: 'megan@chapter3.ca',
    role: 'User',
    title: 'Communications Consultant',
    avatarColor: 'from-blue-600 to-cyan-600',
    initials: 'MS'
  },
  {
    id: 'asangi',
    name: 'Asangi Jasenthuliyana',
    email: 'asangi@chapter3.ca',
    role: 'User',
    title: 'Senior Marketing Consultant',
    avatarColor: 'from-amber-500 to-orange-600',
    initials: 'AJ'
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c-novapulse',
    name: 'NovaPulse Health (B2B SaaS)',
    type: 'Project',
    status: 'Active',
    industry: 'Healthcare Technology',
    leadConsultant: 'MJ Leslie',
    startDate: '2026-08-01',
    targetEndDate: '2026-10-15',
    projectSummary: 'Comprehensive Go-To-Market & Enterprise Sales Repositioning. Conducting customer buyer persona interviews, revising pricing tier structures for enterprise hospital systems, and producing battle-tested sales collateral for sales reps.',
    tasks: [
      {
        id: 't-np-1',
        clientId: 'c-novapulse',
        description: 'Conduct ICP validation interviews with 8 Healthtech Procurement Directors',
        assignedTo: 'mj@chapter3.ca',
        priority: 'High',
        dueDate: '2026-09-02',
        status: 'In Progress',
        deliverableUrl: 'https://docs.google.com/document/d/1NovaPulse-ICP-Findings',
        isRecurring: false,
        notes: [
          {
            id: 'n-np-1',
            authorEmail: 'mj@chapter3.ca',
            authorName: 'MJ Leslie',
            text: 'Completed 6 out of 8 interviews. Key insight: buyer hesitation is mainly around HIPAA audit compliance workflows.',
            timestamp: '2026-08-29 14:20'
          },
          {
            id: 'n-np-2',
            authorEmail: 'david@chapter3.ca',
            authorName: 'David Roe',
            text: 'Let us integrate the security compliance cheat sheet into the upcoming executive pitch deck.',
            timestamp: '2026-08-30 09:15'
          }
        ]
      },
      {
        id: 't-np-2',
        clientId: 'c-novapulse',
        description: 'Finalize Tier-1 Sales Battlecards & Enterprise Objection Handling Guide',
        assignedTo: 'david@chapter3.ca',
        priority: 'High',
        dueDate: '2026-09-04',
        status: 'Not Started',
        deliverableUrl: 'https://notion.so/chapter3/NovaPulse-Sales-Battlecards-v2',
        isRecurring: false,
        notes: [
          {
            id: 'n-np-3',
            authorEmail: 'david@chapter3.ca',
            authorName: 'David Roe',
            text: 'Synthesizing competitive pricing comparisons against Epic and Cerner ecosystem add-ons.',
            timestamp: '2026-08-28 11:30'
          }
        ]
      },
      {
        id: 't-np-3',
        clientId: 'c-novapulse',
        description: 'Design interactive ROI Calculator spreadsheet for enterprise sales demonstrations',
        assignedTo: 'asangi@chapter3.ca',
        priority: 'Medium',
        dueDate: '2026-09-08',
        status: 'In Progress',
        deliverableUrl: 'https://docs.google.com/spreadsheets/d/NovaPulse-Enterprise-ROI-Model',
        isRecurring: false,
        notes: [
          {
            id: 'n-np-4',
            authorEmail: 'asangi@chapter3.ca',
            authorName: 'Asangi Jasenthuliyana',
            text: 'Draft formula inputs configured for hospital bed capacity and nurse overtime savings.',
            timestamp: '2026-08-30 16:45'
          }
        ]
      },
      {
        id: 't-np-4',
        clientId: 'c-novapulse',
        description: 'Deliver core brand positioning statement & value proposition matrix to Executive Board',
        assignedTo: 'megan@chapter3.ca',
        priority: 'High',
        dueDate: '2026-08-25',
        status: 'Complete',
        completedAt: '2026-08-25',
        deliverableUrl: 'https://figma.com/deck/NovaPulse-Value-Prop-Presentation',
        isRecurring: false,
        notes: [
          {
            id: 'n-np-5',
            authorEmail: 'megan@chapter3.ca',
            authorName: 'Megan Savary',
            text: 'Board approved the "Seamless Clinical Flow" narrative unanimously. Moving to sales collateral.',
            timestamp: '2026-08-25 17:00'
          }
        ]
      },
      {
        id: 't-np-5',
        clientId: 'c-novapulse',
        description: 'Initial Stakeholder Discovery & Legacy Sales Deck Audit',
        assignedTo: 'mj@chapter3.ca',
        priority: 'Medium',
        dueDate: '2026-08-10',
        status: 'Complete',
        completedAt: '2026-08-10',
        deliverableUrl: 'https://miro.com/app/board/NovaPulse-Discovery-Map',
        isRecurring: false,
        notes: [
          {
            id: 'n-np-6',
            authorEmail: 'mj@chapter3.ca',
            authorName: 'MJ Leslie',
            text: 'Discovery audit complete. Legacy deck was too feature-heavy and lacked economic buyer ROI framing.',
            timestamp: '2026-08-10 12:00'
          }
        ]
      }
    ]
  },
  {
    id: 'c-apexfin',
    name: 'Apex Financial Technologies',
    type: 'Retainer',
    status: 'Active',
    industry: 'Fintech & Capital Markets',
    leadConsultant: 'David Roe',
    startDate: '2026-06-01',
    projectSummary: 'Ongoing Growth & Outbound Pipeline Optimization Retainer. Chapter 3 provides weekly SDR pipeline coaching, cold outbound sequence A/B testing, HubSpot CRM lifecycle staging, and monthly executive revenue steering.',
    tasks: [
      {
        id: 't-af-1',
        clientId: 'c-apexfin',
        description: 'Weekly Outbound Cold Sequence Optimization & A/B Copy Variant Review',
        assignedTo: 'megan@chapter3.ca',
        priority: 'High',
        dueDate: '2026-09-01',
        status: 'In Progress',
        deliverableUrl: 'https://docs.google.com/document/d/ApexFin-Sequence-Copy-Sprint3',
        isRecurring: true,
        notes: [
          {
            id: 'n-af-1',
            authorEmail: 'megan@chapter3.ca',
            authorName: 'Megan Savary',
            text: 'Subject line test B ("Quick question regarding your compliance pipeline") yielded a 34% open rate and 6 booked meetings.',
            timestamp: '2026-08-30 15:10'
          }
        ]
      },
      {
        id: 't-af-2',
        clientId: 'c-apexfin',
        description: 'Bi-Weekly SDR Live Call Coaching & Objection Handling Workshop',
        assignedTo: 'david@chapter3.ca',
        priority: 'Medium',
        dueDate: '2026-09-03',
        status: 'Not Started',
        deliverableUrl: 'https://loom.com/share/ApexFin-SDR-Workshop-Agenda',
        isRecurring: true,
        notes: [
          {
            id: 'n-af-2',
            authorEmail: 'david@chapter3.ca',
            authorName: 'David Roe',
            text: 'Focusing session on overcoming "we already have an internal custom script" resistance.',
            timestamp: '2026-08-29 10:00'
          }
        ]
      },
      {
        id: 't-af-3',
        clientId: 'c-apexfin',
        description: 'Monthly Pipeline Velocity & SQL Conversion KPI Dashboard Assembly',
        assignedTo: 'asangi@chapter3.ca',
        priority: 'Medium',
        dueDate: '2026-09-07',
        status: 'Not Started',
        deliverableUrl: 'https://app.hubspot.com/reports-dashboard/chapter3-apexfin',
        isRecurring: true,
        notes: []
      },
      {
        id: 't-af-4',
        clientId: 'c-apexfin',
        description: 'HubSpot Lead Scoring & Lifecycle Stage Automation Audit',
        assignedTo: 'asangi@chapter3.ca',
        priority: 'Low',
        dueDate: '2026-08-26',
        status: 'Complete',
        completedAt: '2026-08-26',
        deliverableUrl: 'https://notion.so/chapter3/ApexFin-HubSpot-Automation-Blueprint',
        isRecurring: false,
        notes: [
          {
            id: 'n-af-3',
            authorEmail: 'asangi@chapter3.ca',
            authorName: 'Asangi Jasenthuliyana',
            text: 'Fixed duplicate MQL trigger rules in HubSpot workflow. Lead routing latency cut by 80%.',
            timestamp: '2026-08-26 16:30'
          }
        ]
      }
    ]
  },
  {
    id: 'c-lumina',
    name: 'Lumina Clean Energy Systems',
    type: 'Project',
    status: 'Active',
    industry: 'Renewable Energy & Cleantech',
    leadConsultant: 'MJ Leslie',
    startDate: '2026-07-15',
    targetEndDate: '2026-09-30',
    projectSummary: 'Commercial Market Entry Strategy & Partner Channel Enablement. Developing value propositions for municipal and commercial real estate buyers, structuring referral incentives, and drafting sales playbooks.',
    tasks: [
      {
        id: 't-lum-1',
        clientId: 'c-lumina',
        description: 'Develop Municipal RFP Win-Theme Strategy and Bid Evaluation Template',
        assignedTo: 'mj@chapter3.ca',
        priority: 'High',
        dueDate: '2026-08-28',
        status: 'In Progress',
        deliverableUrl: 'https://docs.google.com/document/d/Lumina-RFP-Win-Themes',
        isRecurring: false,
        notes: [
          {
            id: 'n-lum-1',
            authorEmail: 'mj@chapter3.ca',
            authorName: 'MJ Leslie',
            text: 'Drafting core differentiators focusing on Lumina 15-year battery warranty and zero upfront CAPEX leasing.',
            timestamp: '2026-08-31 08:30'
          }
        ]
      },
      {
        id: 't-lum-2',
        clientId: 'c-lumina',
        description: 'Build Commercial Real Estate Broker Partner One-Pager & Commission Schedule',
        assignedTo: 'megan@chapter3.ca',
        priority: 'Medium',
        dueDate: '2026-09-05',
        status: 'Not Started',
        deliverableUrl: 'https://canva.com/design/Lumina-CRE-Partner-Sheet',
        isRecurring: false,
        notes: []
      },
      {
        id: 't-lum-3',
        clientId: 'c-lumina',
        description: 'Draft Case Study: Industrial Solar Retrofit 42% Cost Reduction for Warehouses',
        assignedTo: 'megan@chapter3.ca',
        priority: 'Low',
        dueDate: '2026-09-12',
        status: 'Not Started',
        deliverableUrl: '',
        isRecurring: false,
        notes: []
      },
      {
        id: 't-lum-4',
        clientId: 'c-lumina',
        description: 'Competitor Channel Partner Commission & Incentive Benchmark Study',
        assignedTo: 'asangi@chapter3.ca',
        priority: 'Medium',
        dueDate: '2026-08-20',
        status: 'Complete',
        completedAt: '2026-08-20',
        deliverableUrl: 'https://docs.google.com/spreadsheets/d/Lumina-Competitor-Benchmarking',
        isRecurring: false,
        notes: [
          {
            id: 'n-lum-2',
            authorEmail: 'asangi@chapter3.ca',
            authorName: 'Asangi Jasenthuliyana',
            text: 'Analyzed 5 regional competitors. Market standard is 4.5% first-year contract commission.',
            timestamp: '2026-08-20 14:00'
          }
        ]
      }
    ]
  },
  {
    id: 'c-internal-q3',
    name: 'Chapter 3 Internal Operations & Growth',
    type: 'Internal',
    status: 'Active',
    industry: 'Management Consulting',
    leadConsultant: 'All',
    startDate: '2026-01-01',
    projectSummary: 'Chapter 3 firm-wide initiatives, internal sales collateral updates, website case studies publication, recruiting pipeline, and consulting framework standardization.',
    tasks: [
      {
        id: 't-int-1',
        clientId: 'c-internal-q3',
        description: 'Publish Chapter 3 Q3 State of B2B Sales Effectiveness Industry Whitepaper',
        assignedTo: 'david@chapter3.ca',
        priority: 'High',
        dueDate: '2026-09-04',
        status: 'In Progress',
        deliverableUrl: 'https://chapter3.ca/insights/b2b-sales-effectiveness-2026',
        isRecurring: false,
        notes: [
          {
            id: 'n-int-1',
            authorEmail: 'david@chapter3.ca',
            authorName: 'David Roe',
            text: 'Copy editing pass finished. Need graphic assets for chart 3 and chart 7.',
            timestamp: '2026-08-30 11:00'
          },
          {
            id: 'n-int-2',
            authorEmail: 'megan@chapter3.ca',
            authorName: 'Megan Savary',
            text: 'Charts exported in high resolution brand palette. Uploaded to shared asset drive.',
            timestamp: '2026-08-30 14:30'
          }
        ]
      },
      {
        id: 't-int-2',
        clientId: 'c-internal-q3',
        description: 'Monthly Consultant Practice Billing Reconciliation & Revenue Forecast',
        assignedTo: 'mj@chapter3.ca',
        priority: 'High',
        dueDate: '2026-09-01',
        status: 'Not Started',
        deliverableUrl: 'https://docs.google.com/spreadsheets/d/Chapter3-Financials-Q3',
        isRecurring: true,
        notes: []
      },
      {
        id: 't-int-3',
        clientId: 'c-internal-q3',
        description: 'Standardize Chapter 3 "Discovery-to-Close" Consulting Playbook Notion Templates',
        assignedTo: 'asangi@chapter3.ca',
        priority: 'Medium',
        dueDate: '2026-09-10',
        status: 'In Progress',
        deliverableUrl: 'https://notion.so/chapter3/Consulting-Methodology-Hub',
        isRecurring: false,
        notes: [
          {
            id: 'n-int-3',
            authorEmail: 'asangi@chapter3.ca',
            authorName: 'Asangi Jasenthuliyana',
            text: 'Finished templates for Sprint 1 ICP mapping and Sprint 2 Sales Messaging audit.',
            timestamp: '2026-08-28 17:15'
          }
        ]
      },
      {
        id: 't-int-4',
        clientId: 'c-internal-q3',
        description: 'Update Team Headshots and Consultant Bios on chapter3.ca/about',
        assignedTo: 'megan@chapter3.ca',
        priority: 'Low',
        dueDate: '2026-08-15',
        status: 'Complete',
        completedAt: '2026-08-15',
        deliverableUrl: 'https://chapter3.ca/about',
        isRecurring: false,
        notes: [
          {
            id: 'n-int-4',
            authorEmail: 'megan@chapter3.ca',
            authorName: 'Megan Savary',
            text: 'New photos uploaded and bio copy reviewed with MJ and David.',
            timestamp: '2026-08-15 10:00'
          }
        ]
      }
    ]
  },
  {
    id: 'c-stratascaling',
    name: 'StrataScale Supply Chain Logistics',
    type: 'Project',
    status: 'Inactive',
    industry: 'Freight & Supply Chain Tech',
    leadConsultant: 'David Roe',
    startDate: '2026-03-01',
    targetEndDate: '2026-06-30',
    projectSummary: 'Series A GTM Launch & Sales Enablement Architecture. Built outbound cadence workflows, trained 6 account executives, and mapped account-based marketing (ABM) strategy for mid-market 3PL logistics carriers.',
    tasks: [
      {
        id: 't-ss-1',
        clientId: 'c-stratascaling',
        description: 'Complete 3PL Logistics Cold Outreach Scripting and Email Playbooks',
        assignedTo: 'david@chapter3.ca',
        priority: 'High',
        dueDate: '2026-06-15',
        status: 'Complete',
        completedAt: '2026-06-15',
        deliverableUrl: 'https://docs.google.com/document/d/StrataScale-Outbound-Playbook',
        isRecurring: false,
        notes: [
          {
            id: 'n-ss-1',
            authorEmail: 'david@chapter3.ca',
            authorName: 'David Roe',
            text: 'Project completed successfully with target SQLs exceeded by 35%. Client archived into alumni portfolio.',
            timestamp: '2026-06-28 15:00'
          }
        ]
      },
      {
        id: 't-ss-2',
        clientId: 'c-stratascaling',
        description: 'Deliver Final Engagement Debrief & Annual Scaling Recommendations Deck',
        assignedTo: 'mj@chapter3.ca',
        priority: 'Medium',
        dueDate: '2026-06-25',
        status: 'Complete',
        completedAt: '2026-06-25',
        deliverableUrl: 'https://figma.com/deck/StrataScale-Executive-Debrief',
        isRecurring: false,
        notes: []
      }
    ]
  },
  {
    id: 'c-vanguard',
    name: 'Vanguard Cyber Resilience',
    type: 'Retainer',
    status: 'Inactive',
    industry: 'Cybersecurity & Compliance',
    leadConsultant: 'MJ Leslie',
    startDate: '2025-11-01',
    targetEndDate: '2026-05-31',
    projectSummary: 'Advisory Retainer for Fractional VP of Marketing & Enterprise Demand Generation. Handled quarterly pipeline audits and executive positioning for CISO buyers.',
    tasks: [
      {
        id: 't-vg-1',
        clientId: 'c-vanguard',
        description: 'Deliver H1 2026 Demand Gen Review and Inbound Channel Attribution Report',
        assignedTo: 'mj@chapter3.ca',
        priority: 'High',
        dueDate: '2026-05-20',
        status: 'Complete',
        completedAt: '2026-05-20',
        deliverableUrl: 'https://docs.google.com/presentation/d/Vanguard-H1-Review',
        isRecurring: false,
        notes: []
      }
    ]
  },
  {
    id: 'c-aero-prospect',
    name: 'AeroFlow Dynamics (Autonomous Drone Logistics)',
    type: 'Prospecting',
    status: 'Active',
    industry: 'Aerospace & Industrial Robotics',
    leadConsultant: 'David Roe',
    startDate: '2026-08-15',
    prospectingStage: 'Active Deal',
    projectSummary: 'Exploring New Engagement for Series B commercial expansion. Scoping a 3-month Go-To-Market overhaul, outbound enterprise pitch deck for defense/logistics contractors, and pricing model restructuring.',
    tasks: [
      {
        id: 't-ap-1',
        clientId: 'c-aero-prospect',
        description: 'Prepare Enterprise Commercial Readiness Proposal & Statement of Work',
        assignedTo: 'david@chapter3.ca',
        priority: 'High',
        dueDate: '2026-09-03',
        status: 'In Progress',
        deliverableUrl: 'https://docs.google.com/document/d/AeroFlow-Draft-SOW',
        isRecurring: false,
        notes: [
          {
            id: 'n-ap-1',
            authorEmail: 'david@chapter3.ca',
            authorName: 'David Roe',
            text: 'Completed initial scoping call with CEO. Budget approved for Q4 advisory kick-off.',
            timestamp: '2026-08-30 15:10'
          }
        ]
      },
      {
        id: 't-ap-2',
        clientId: 'c-aero-prospect',
        description: 'Conduct Competitive Fee Benchmark with Comparable Robotics Advisory Engagements',
        assignedTo: 'mj@chapter3.ca',
        priority: 'Medium',
        dueDate: '2026-09-06',
        status: 'Not Started',
        isRecurring: false,
        notes: []
      }
    ]
  },
  {
    id: 'c-solaria-prospect',
    name: 'Solaria BioSystems (Genomic Therapeutics)',
    type: 'Prospecting',
    status: 'Active',
    industry: 'Biotechnology & Life Sciences',
    leadConsultant: 'MJ Leslie',
    startDate: '2026-08-20',
    prospectingStage: 'Quoted',
    projectSummary: 'Exploring New Engagement for Commercial Positioning & Investor Storytelling. Submitted customized 6-month advisory proposal for Series A fundraising narrative and pharma partnership decks.',
    tasks: [
      {
        id: 't-sp-1',
        clientId: 'c-solaria-prospect',
        description: 'Send Formal Phase-1 Advisory Quote and Follow-up on Steering Committee Review',
        assignedTo: 'mj@chapter3.ca',
        priority: 'High',
        dueDate: '2026-09-01',
        status: 'In Progress',
        deliverableUrl: 'https://docs.google.com/document/d/Solaria-Quote-v1',
        isRecurring: false,
        notes: [
          {
            id: 'n-sp-1',
            authorEmail: 'mj@chapter3.ca',
            authorName: 'MJ Leslie',
            text: 'Quote delivered to VP Corporate Development on August 28th. Awaiting contract sign-off.',
            timestamp: '2026-08-29 11:45'
          }
        ]
      }
    ]
  }
];
