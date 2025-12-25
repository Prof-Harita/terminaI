AI-Powered Desktop Automation: Adoption Challenges and Opportunities

Executive Summary

AI desktop/GUI automation agents – exemplified by Anthropic’s Claude “Computer
Use” (Oct 2024) and OpenAI’s Operator (Jan 2025) – promised to revolutionize
workflow automation by letting AI control computers like a human user. Over a
year later, however, these agents remain niche. Key findings indicate that
mainstream adoption has been hampered by technology limitations, security
concerns, market friction, and user experience hurdles. Technically, current
agents are far from human-level reliability, completing barely 15–40% of
open-ended computer tasks (vs ~70% for humans)[1][2]. Common failure modes
include mis-clicks, timing issues, and inability to handle dynamic UI elements
(e.g. pop-ups, scrollable panels), leading to frequent errors[3][4]. Early users
report the agents can be slow and inconsistent, often requiring human
oversight[4][5]. On the security front, enterprises cite serious concerns:
giving an AI keyboard/mouse control introduces new attack vectors (e.g. prompt
injection) and potential for accidental or malicious actions[6][7]. Notably,
2025 saw the first AI-orchestrated cyberattack, where hackers manipulated an AI
agent to breach organizations[8][9] – a dramatic example fueling IT distrust.

From a market perspective, adoption has been limited to early adopters and
pilots. Tech companies (Replit, Instacart, DoorDash, etc.) have experimented
with these agents for specialized use cases[10][11], and some individual
power-users utilize them for personal productivity (e.g. auto-filling forms,
booking tickets). However, no “killer app” has emerged that would drive broad
usage – most trial users do not convert to regular use, citing unreliable
results and the high $200/month cost for OpenAI’s Operator[12][13]. Compared to
traditional RPA (UiPath, Automation Anywhere), AI agents lack enterprise-ready
polish: RPA tools still dominate high-stakes, deterministic processes (e.g.
invoice processing) where mistakes are unacceptable[14]. RPA vendors, in turn,
have integrated generative AI cautiously – e.g. using LLMs to assist in
unstructured data steps – while emphasizing that core automation must remain
reliable, governed, and auditable[15][16].

User experience remains a barrier to mainstream use. Non-technical users
struggle with these AI agents despite their natural language interfaces.
Teaching an agent a task is easy (“just ask it”), but debugging failures is hard
– when the agent inevitably errs, users often must intervene and correct it
manually[17][18]. Current agent UIs do provide some visual feedback (e.g.
showing screenshots and highlighting clicks in real time), allowing users to
monitor progress[19][20]. But this means users must babysit the automation
(“watch mode”) for sensitive tasks, negating some benefits[21][22]. Enterprise
IT departments have thus been reluctant to approve deployments: the lack of
robust error handling, audit trails, and compliance guarantees makes these
agents feel like risky beta tools rather than enterprise products[14][23].

Root cause analysis points to technical immaturity as the highest-impact
barrier: the underlying vision-and-action models only recently reached ~38%
success on benchmarks (up from <8% a year prior)[2], and still struggle with
basic GUI actions like scrolling and dragging[24][3]. Close behind are security
and trust issues – organizations fear data leakage and uncontrolled actions, a
concern amplified by real incidents and strict regulations (HIPAA, GDPR)[18][9].
Market and cost factors rank next: the value proposition remains unproven for
most businesses, pricing is high, and sales efforts have been limited. Finally,
user experience challenges – while significant – tend to stem from the former
issues (e.g. needing to monitor the agent because it’s error-prone). Overall, AI
GUI agents have shown exciting potential (e.g. saving time on web transactions
and offering natural interaction), but to cross the chasm into mainstream use,
they must become dramatically more reliable, secure, and enterprise-friendly.

Root Cause Analysis (Ranked by Impact)

Technical Limitations of Vision-Based GUI Automation: Current AI agents lack the
accuracy and robustness needed for dependable automation. State-of-the-art
agents can only complete ~30–40% of complex computer tasks autonomously, far
below human success rates[1][2]. They often click wrong elements, mis-read
interfaces, or fail to handle dynamic events (e.g. pop-up dialogs or page
loads). Basic GUI actions like scrolling, dragging, and multi-step form
interactions are error-prone or unsupported[24][3]. Latency is another issue –
the “flipbook” approach of processing screenshots leads to slow reaction times
and missed transient UI changes[3]. In short, the technology is still immature:
the AI may follow instructions, but not with the consistency and speed of a
human operator, causing frequent failures. This fundamental reliability gap is
the primary reason organizations haven’t embraced these tools for
mission-critical workflows.

Security, Privacy & Trust Concerns: Handing over keyboard/mouse control to an AI
raises red flags for security teams. Prompt injection attacks can trick the
agent into executing malicious actions by embedding hidden instructions in a
webpage or interface[6][7]. A striking example in 2025 saw attackers jailbreak
Anthropic’s Claude agent and use it to conduct cyber-espionage, with the AI
performing 80–90% of the hack autonomously[8][25]. This “AI agent gone rogue”
scenario highlights how AI automation can dramatically amplify cyber
threats[26][27]. Even without malicious intent, an agent could accidentally leak
sensitive data (e.g. copying confidential info into a form or chat) or make
unauthorized changes. Enterprises also face compliance barriers: many
regulations (GDPR, HIPAA, SOC2) require strict control over data and processes,
which is hard to guarantee with a black-box AI agent. To date, there is no
established liability framework or insurance for AI automation errors – vendors
typically classify these agents as “beta” with users assuming the risk[28][12].
Consequently, IT departments and auditors err on the side of caution, often
forbidding or sandboxing AI agents in corporate environments[23][18]. The trust
deficit – fear that the AI might do something unsafe or non-compliant – is a
major adoption blocker.

Market and Customer Adoption Factors: The current value proposition is unproven
for most users. Early adopters are primarily tech enthusiasts and specific teams
at tech companies (e.g. Replit using Claude to test apps, or Instacart exploring
automated ordering)[10][29]. For the average business user, it’s unclear where
AI agents definitively outperform existing tools. Many pilot users try these
agents out of curiosity but do not retain them long-term, citing frustrations
with errors or limited practical benefit. Pricing is another deterrent –
OpenAI’s Operator launched at $200/month for Pro access[30][12], a hefty sum
unless it reliably saves significant time. Traditional RPA vendors note that
enterprise sales cycles for automation are lengthy – buyers need to see clear
ROI and reliability. AI agents so far don’t fit well into these cycles; they’re
positioned as self-serve products rather than solutions with integration support
and ROI case studies. Additionally, competitive responses have slowed adoption:
RPA companies (UiPath, Automation Anywhere) have leveraged their incumbency to
retain customers by blending LLM features into their offerings (for example,
using ChatGPT connectors for document understanding)[31][14]. They emphasize
that their deterministic bots are “more reliable, faster and cheaper” for
repetitive tasks[16], framing the new AI agents as interesting but not
enterprise-ready. With no strong “killer app” demonstrating undeniable value
across industries, the market demand remains modest and experimental.

User Experience & Usability Challenges: Despite natural language interfaces,
these agent tools require a mindset shift and careful use that many users
struggle with. Creating an automation via AI is easy (just describe the task),
but handling exceptions is hard. When a traditional RPA script fails, a
developer debugs the code; when an AI agent fails, an end-user has to figure out
why the AI got confused and rephrase instructions or intervene manually[17][18].
This can be daunting for non-technical users, especially without robust
debugging tools. Current agents do provide some transparency – for example,
Claude’s interface shows a live feed of the desktop and the AI’s step-by-step
commentary[19]. OpenAI’s Operator similarly lets users watch the agent’s browser
and even take over control at any point[32][21]. While this “human-in-the-loop”
design is meant to increase safety, it also means the user must actively babysit
the automation for complex tasks, reducing the convenience. The learning curve
involves discovering the agent’s quirks (e.g. knowing it can’t solve CAPTCHAs or
won’t enter passwords for you) and learning how to prompt effectively for
multi-step workflows. In comparison, traditional RPA requires upfront effort to
program but then runs unattended; AI agents flip this – minimal setup, but
potentially lots of run-time supervision. Many users find that monitoring an
unreliable AI agent is just as tedious as doing the task oneself, negating the
UX benefits. Until the agents can handle routine variations and errors
gracefully (or provide better tooling for users to correct them), usability will
continue to hinder broader adoption beyond tech-savvy experimenters.

Business Model & Go-to-Market Execution: The launch strategies for these AI
agent products have been cautious, almost tentative. Anthropic’s Computer Use
was released as an API beta “for developers” with warnings that it’s “cumbersome
and error-prone”[33]. OpenAI’s Operator was restricted to U.S. Pro subscribers
initially, labeled a research preview[34][35]. Neither company invested in
large-scale marketing or sales for these tools; they were positioned as
experimental add-ons rather than core offerings. As a result, awareness and
understanding in the broader market are low – many potential enterprise users
simply don’t know what these agents can do, or have only seen the hype
headlines. Within the companies, these projects appear to be side initiatives
(albeit strategically interesting ones) rather than revenue-driving products.
For instance, OpenAI folded Operator into ChatGPT by mid-2025 (sunsetting the
standalone product)[36], suggesting it’s a feature to enhance ChatGPT’s value,
not a separate business line. This limited go-to-market push means there’s been
little education for customers on how to deploy AI automation or integration
into existing systems. In contrast, RPA vendors have dedicated sales and
customer success teams to drive adoption, conduct POCs, and ensure deployments
succeed. The AI startups lack such support structures in this domain.
Additionally, partnerships that could accelerate trust – e.g. deep integrations
with Microsoft Office or ServiceNow – are not yet mature (though, notably,
Anthropic did partner with Snowflake and Accenture on “agentic AI for
enterprises”[37][38]). In summary, early AI agent offerings haven’t been
packaged and pushed in a way that resonates with mainstream business buyers. The
total addressable market (TAM) is theoretically huge (tens of billions of
dollars as automation extends to every knowledge worker[39][40]), but actual
go-to-market execution has not tapped into this potential.

Evidence Table

Competitive Landscape Map

Major Players and Approaches (2024–2025):

OpenAI – Operator (and “Computer-Using Agent”): Launch: Jan 2025 (research
preview). Capabilities: Browser-centric automation using GPT-4 vision and
reinforcement learning[103]. Focus on web tasks (filling forms, clicking buttons
on websites) with an integrated browser. Status: Beta feature of ChatGPT
(limited to Pro tier initially)[35]. Strengths: Cutting-edge model (GPT-4o) with
strong web knowledge, achieved state-of-art on web benchmarks (87% WebVoyager
success)[104]. Collaborative safety design (hands back control for logins,
etc.)[21]. Weaknesses: Limited to browser (no direct desktop app control yet),
expensive subscription, and still prone to errors on complex sites[105].
Adoption: Low so far – mostly individual users and small trials; being folded
into broader ChatGPT offerings for future growth[36].

Anthropic – Claude “Computer Use” Capability: Launch: Oct 2024 (public beta
API). Capabilities: Full desktop GUI control via screenshots, coordinates, and
virtual mouse/keyboard[78][106]. Can in theory use any app like a human (was
demonstrated on Linux VM with apps like Firefox, Calculator, text
editor)[107][108]. Status: Experimental developer feature of Claude 3.5;
requires API integration and a sandbox environment (no consumer UI provided by
Anthropic directly)[109][44]. Strengths: First mover in releasing an agentic UI
model; had best performance on initial OSWorld benchmark[1]. Deep partnerships
(Google Cloud, AWS, Slack, etc.) indicate an ecosystem play. Weaknesses: Marked
by Anthropic itself as “cumbersome and error-prone”[88] – not production-ready.
Lacks a friendly end-user interface (developers must build one using the API).
Adoption: Very limited beyond tech-savvy developers; some enterprise pilots
through partners (Accenture, Snowflake) are likely ongoing but no public case
studies yet[37].

Google DeepMind – Project Mariner: Launch: Limited preview in 2025 (Labs
prototype). Capabilities: An AI agent leveraging Google’s Gemini multimodal
model to automate web browsing tasks (up to 10 simultaneous tasks)[110][111].
Emphasis on “Teach & Repeat” for workflow automation in browser, and likely
integration with Google’s ecosystem (Chrome, etc.). Status: Experimental (Google
Labs offering to select users)[110]. Strengths: Likely powerful model (Gemini),
and tight integration with web (Chrome/Android). Google’s expertise in UI
datasets (e.g. Android UI benchmarks) may help model performance. Weaknesses:
Not widely available; Google’s slower external rollout due to AI ethics concerns
means it’s behind in gathering real user feedback. Adoption: Unknown outside
Google – possibly some internal use and limited external testers (e.g. DataCamp
examples[112]). Google’s enterprise credibility could help when it launches
fully, but as of 2025 it’s not a major player in market adoption yet.

Open-Source AI Agents: Key projects: Open Interpreter (2023) – lets GPT-4 run
code on your local machine; AutoGPT/AgentGPT (2023) – chaining GPT calls to
attempt autonomous task completion; LangChain-based agents – custom Python
frameworks combining tools. Capabilities: These vary, but generally allow some
automation via executing code, browser automation with Selenium, etc., using
open APIs. Open Interpreter, for example, can execute shell commands, open
files, and interact with the local environment via an LLM acting as
“coder”[113][114]. AutoGPT can use browser plugins, file I/O, and more by
instructing itself through loops. Status: Highly experimental, community-driven.
Strengths: Self-hosted (better privacy), highly customizable (developers can
extend them), and low cost aside from compute (no $200/month fee – just API
costs or local model). Weaknesses: Even more unreliable than closed solutions –
AutoGPT famously often got stuck or went in circles for non-trivial tasks[115].
Requires technical savvy to set up and use (command-line tools, GitHub repos).
No formal support or safety guardrails (risk of the agent doing something
harmful if not carefully constrained by the user). Adoption: Mainly hobbyists
and researchers. For instance, Open Interpreter was popular among developers who
wanted local ChatGPT-style automation, but it’s not something a non-engineer
would deploy for daily business tasks. These tools did, however, prove demand
for more control and contributed ideas (loop management, tool use) that
influenced commercial agents.

Traditional RPA Vendors (UiPath, Automation Anywhere, Blue Prism): Approach:
Augment existing RPA platforms with generative AI assistants rather than fully
autonomous agents. UiPath introduced features like Clipboard AI (GPT-powered
email reply suggestions) and integrations allowing bots to call GPT for
decisions. Automation Anywhere launched an “AI Agent Studio” in 2025 to create
AI-assisted automations, and packaged pre-built AI agents for tasks like
document analysis[68][69]. Positioning: These vendors pitch “Agentic Process
Automation (APA)” – essentially RPA + GenAI – as the next evolution, stressing
enterprise readiness. They highlight that their AI is governed (running in
secure environments, with human validation steps as needed)[14][66]. Strengths:
Deep enterprise relationships, robust security/compliance credentials, and
well-established orchestration tools. Their bots can directly integrate with
business applications (including via APIs or connectors) which can be more
efficient than vision-only approaches. They also provide support and services to
implement automation. Weaknesses: Their AI capabilities, so far, are narrower –
they might not yet match the generality of OpenAI/Anthropic agents in
understanding arbitrary interfaces. Development with RPA + AI may still require
more effort than the end-to-end magic the new AI agents aim for. Also, their
legacy architecture may not be as nimble in iterating AI features. Adoption:
Many enterprises are experimenting with generative AI within their RPA platforms
(e.g. using an AI to draft an email response that the RPA bot then sends). The
installed base of RPA means these features can reach companies faster in a
controlled way. In essence, RPA vendors act as fast followers, likely to
incorporate full autonomous GUI agent capabilities once they are stable – but
until then, they act as a buffer keeping many enterprise customers on the
traditional path.

Emerging Startups: Beyond big players, a number of startups (e.g. Relay.app,
Stack AI, AirOps, Devin AI) are building “AI agent” platforms focusing on
specific domains or ease-of-use. These often provide a no-code interface to
create task-specific agents (for marketing, customer support, coding, etc.) and
integrate with popular apps. Strengths: Niche focus allows them to optimize
agents for certain workflows (e.g. Devin AI targets software development tasks
with its own shell and editor[116][117]). They also sometimes offer lower
pricing or freemium models to attract small business users[118][119].
Weaknesses: As startups, they lack the cutting-edge models of OpenAI or the
enterprise trust of RPA incumbents – many are wrappers around OpenAI/Anthropic
APIs with some custom tooling. Consolidation is likely (not all will survive the
competition once big players strengthen offerings). Adoption: A small but
growing segment of early business adopters have tried these – e.g. marketers
using AI agent tools for automating report generation or SEO tasks[120][121].
With G2 ratings often 4.5+[122], there’s positive reception in niches. But none
has become a breakout leader; they collectively indicate a fertile ground for
specialized AI agents, while broad general-purpose automation remains dominated
by the bigger tech companies.

(See source references in the Evidence Table for specific details on each
product.)

Opportunity Assessment for a New Entrant

Despite the challenges, this emerging space presents significant opportunities
for a savvy new entrant, especially one targeting the gaps left by current
solutions. Key opportunities include:

Privacy & Self-Hosting: Many organizations (and even individual power-users) are
uneasy sending screenshots or data to third-party clouds[18]. A new entrant that
offers an on-premises or private cloud AI agent could attract those customers.
This means providing an agent that can run on the client’s infrastructure (or
VPC) and possibly even work with open-source LLMs for those who require data not
leave their environment. By alleviating data residency and compliance worries, a
self-hosted solution could unlock adoption in finance, healthcare, government,
and EU markets that are currently no-go for OpenAI’s cloud-based Operator.

Enterprise-Grade Features Out-of-the-Box: There is a window to differentiate by
being “enterprise-first”. A new agent platform that bakes in governance,
security, and reliability features would stand out. For example, it could
maintain a complete audit log of every action and screenshot, provide admin
controls to set what the agent is allowed to do (whitelisting apps or sites),
and include an approval workflow for high-impact transactions (so the agent’s
plan is reviewed before execution). None of the current leading agents have
robust governance tools yet – filling that gap could make the difference for an
enterprise deciding to try this technology. The entrant could pursue
certifications (SOC2, ISO27001) early to build trust. Essentially, become the
“Palantir of AI agents” – heavy on security and audit – which incumbents will
take time to pivot toward.

Reliability via Hybrid Automation: Complete vision-based autonomy is cool but
not always necessary. There’s an opportunity to improve reliability by combining
UI automation with direct integration where available. A new entrant could
position as “smarter automation” that uses vision when it must, but seamlessly
uses APIs or RPA-like connectors when possible. For instance, if automating an
order entry, the agent might use the official API for some data push and the UI
only for parts with no API. This hybrid approach could dramatically reduce
errors and speed up execution (no more waiting for screen rendering or
pixel-clicking when not needed). Traditional RPA has connectors but no AI
flexibility; the new agent could bridge that gap – marketing itself as “best of
both worlds: the flexibility of AI with the reliability of traditional
integration”.

Focused Vertical Solutions: Rather than a general consumer agent, a new player
could tackle a specific industry’s pain point with a fine-tuned agent. For
example, an agent for the insurance industry that knows how to navigate common
insurance software and websites, populate claim forms, check multiple systems
for data, etc. By training on the UIs of, say, the top 5 insurance claim systems
and hard-coding some domain knowledge, the agent could deliver very concrete
value (e.g. processing claims 30% faster). Similarly, in healthcare revenue
cycle, or supply chain management – a purpose-built agent that’s 90% reliable on
a defined set of apps is more immediately useful than a general agent that’s 40%
on anything. These become “vertical AGI assistants” that can be sold with a
clear ROI to that industry. Big providers haven’t delivered this yet – they’re
horizontal – so a startup could gain traction, which could later either expand
horizontally or be acquired by a larger firm wanting that vertical expertise.

Cost-Effective or Open Business Model: There’s room for an entrant to
differentiate on pricing and openness. OpenAI’s $200/month and others’ usage
fees leave out hobbyist, academic, and long-tail business use. A company that
offers a more affordable tier (perhaps a community edition or an ad-supported
model for individual productivity) could amass a larger user base quickly.
Alternatively, an open-core model (open-source the agent platform, sell
enterprise support) could attract the developer community to contribute and
rapidly improve the product. Given how much excitement there is in open-source
AI, an open entrant might replicate the success of projects like Moodle or Red
Hat in their domains – becoming the de facto choice for those who want control
and cost savings. While it may not yield huge revenue per user initially, it can
drive adoption and network effects (people build plugins, share automations,
etc., around your platform).

Augmenting (Not Replacing) RPA in Enterprises: A pragmatic opportunity is to
position an AI agent as a complement to existing RPA investments. Instead of
telling enterprises “rip out UiPath for our AI,” the entrant can integrate with
RPA tools – e.g. provide a module that when a bot encounters an exception or
non-scripted scenario, it passes control to the AI agent. This leverages the
reliability of RPA for the known parts and the flexibility of AI for the
unknown. It eases the minds of RPA-heavy organizations that an AI agent won’t
run wild, because it’s embedded in their orchestrator with the same oversight.
None of the current big AI players have tight RPA integration (OpenAI/Anthropic
operate independently). A startup partnering with RPA vendors or at least making
it easy to plug into their workflows could gain a foothold. Over time, as trust
in the AI grows, it could take on more of the process, but this Trojan-horse
strategy gets it in the door under the guise of enhancing, not disrupting, the
status quo.

In summary, while the giants grapple with reliability and trust, a new entrant
can succeed by targeting specific unmet needs: privacy, enterprise governance,
hybrid reliability, vertical optimization, and integration friendliness. The
market is young – no one has “won” yet – so a focused and credible solution can
still capture significant share of the opportunity.

Recommended Positioning and Differentiation Strategy

For a new entrant aiming to capitalize on these opportunities, we recommend the
following positioning and differentiation approach:

1. Emphasize “Trustworthy Automation” as your core brand: Position your AI agent
   platform as the trustworthy, enterprise-safe choice in a field of
   experimental toys. This means marketing it as “SecureAI Agent” (for example)
   with taglines around safety, control, and reliability. Explicitly address the
   elephant in the room – trust. For instance: “Unlike other AI assistants, our
   agent never acts outside your policies and keeps you in control at all
   times.” Back this up with concrete features: highlight your audit logs,
   permission controls, and sandboxing. By making trust and safety your key
   differentiators, you turn a current weakness of the market into your
   strength[14][22].

2. Showcase High Reliability with Hybrid Approach: Differentiate by touting
   “No-Error Automation” or “99% accuracy on supported workflows.” Develop case
   studies or demos where your agent completes tasks without hiccups, thanks to
   using APIs or pre-built connectors. For example, show it filling a web form,
   then calling an API to verify submission, handling a pop-up gracefully, etc.,
   all while narrating its confidence. If you can demonstrate significantly
   higher success rates than the known 30–50% range of pure vision
   agents[2][123], businesses will take note. Use metrics: “In our pilots, tasks
   that standard AI agents failed 60% of the time were completed with 95%
   success using our system[124].” Even if initially it’s limited to certain
   apps, advertising those concrete reliability stats will build credibility.
   Essentially, position as “The AI agent that actually gets the job done, not
   just demo-able.”

3. Provide Transparency and Human Control in UX: To alleviate user anxiety, your
   product UX should visibly incorporate the user in the loop. For instance,
   always start in a preview mode where the agent shows a step-by-step plan and
   highlights where it will click, and require the user to approve or skip steps
   (optionally auto-approve routine ones). Market this as “You’re the pilot, AI
   is the co-pilot”, flipping the narrative that AI might run off on its own. By
   giving users a feeling of control, you differentiate from the somewhat opaque
   experiences others had (“it just starts doing stuff and I hope it doesn’t
   mess up”). This could be a “guided automation mode” that no one else offers –
   it’s either manual or fully auto with them, whereas you offer a spectrum.
   This addresses both usability and trust, and becomes a selling point
   especially for new users: “Our agent will never surprise you – you see and
   approve everything it does, until you decide to trust it fully.”

4. Target a Specific Beachhead Use Case and Excel at It: Focus your messaging on
   one killer application where your agent shines, and use that as the tip of
   the spear. For example, if you choose automating SaaS data entry (a common
   pain point), build deep support for say Salesforce, Oracle Netsuite, and a
   generic web form filler with field validation. Then craft a story: “Meet
   AcmeAI Agent – your sales ops assistant. It can take an Excel of leads and
   fully populate your CRM, cross-checking for duplicates and sending welcome
   emails – all in minutes, with no errors.” By showing mastery in a valuable
   niche, you gain traction and word-of-mouth. Use customer testimonials from
   that vertical (“This saved us 5 hours a week in Sales Ops!”). Meanwhile,
   competitors are trying to be everything for everyone and have mostly general
   examples; your specialization makes your value proposition more tangible.
   Once you dominate one use-case, expand adjacent (perhaps from sales ops to
   finance ops, etc.). This land-and-expand with strong initial positioning
   beats a diluted “we can do anything kinda” message.

5. Align with IT Governance Needs – be the Friend, not Rebel: Unlike some
   Silicon Valley products that try to bypass IT, position yours as IT’s best
   friend. Speak the language of CIOs and IT managers: emphasize compliance,
   integration, and oversight. For instance, “AcmeAI Agent integrates with your
   Active Directory/SSO – only authorized users can run automations, and all
   actions are logged to your SIEM for audit.” This differentiation (deep
   enterprise integration) will set you apart from standalone tools. Provide
   easy hooks to ServiceNow/Jira for incident logging if the agent encounters
   issues, showing you fit into existing IT workflows. Essentially, instead of
   causing IT headaches, you solve them: “No more shadow RPA – our solution
   gives IT full visibility and control.” This positioning could turn IT
   departments from skeptics into champions, because you acknowledge their
   concerns up front (a strategy UiPath successfully used in its rise, by
   focusing on governance).

6. Offer Flexible Deployment and Pricing: Differentiate with how customers can
   adopt your solution. For deployment, offer both cloud and on-prem, or a
   hybrid model. Emphasize the choice: “Use our cloud for convenience or deploy
   on your own servers for full control – your data, your choice.” Few
   incumbents offer on-prem due to the complexity of hosting AI; if you manage
   to, it’s a big trust signal. On pricing, consider a usage-based model or tier
   that lowers the barrier to try. For example, a free tier that allows 100
   actions per month could attract individual professionals (this seeded growth
   can later translate into enterprise interest). Or a success-based pricing
   (“pay per successful automation”) could underscore your confidence in
   reliability and align with customer value – a bold differentiator if
   feasible. By being flexible where others are rigid (OpenAI had one high
   price, no on-prem; RPA has only enterprise contracts), you can capture
   segments of the market currently unserved.

7. Cultivate an Open Ecosystem (Plugins/Community): Make your platform
   extensible and highlight this. For instance, “Developers can easily add new
   skills to our agent – we provide a SDK for custom actions or recognizers.”
   This way, if your agent doesn’t natively support an app, the customer or
   third-party can add a plugin. Promote a community library of agent
   templates/integrations. This is a differentiator against closed systems
   (where users wait for OpenAI to add features). If you achieve a critical
   mass, your agent could become the WordPress of automation – popular in part
   because of extensibility. Use this to position as future-proof and versatile:
   “No single company can natively support every app – but with our open plugin
   system, our users collectively can. You’ll never be stuck with a black box.”
   This also appeals to enterprise developers and integrators, who want to
   tailor solutions – giving you an edge in B2B sales by enabling professional
   services partnerships, etc.

In executing this strategy, ensure all messaging reinforces a central theme:
“Enterprise-ready AI automation you can trust.” Your differentiation comes from
being the grown-up in the room about safety and reliability, while still
delivering the cutting-edge capabilities of AI. Every feature or policy you
implement – from robust safety checks[22] to hybrid integration to compliance –
then feeds into that narrative. By addressing head-on why the first wave hasn’t
gone mainstream (and showing that you’ve solved those pain points), your
positioning will resonate strongly with the cautious but potentially huge market
of mainstream enterprise users.

[1] [3] [7] [37] [38] [42] [43] [71] [82] [83] [87] [89] [107] [108] Developing
a computer use model \ Anthropic

https://www.anthropic.com/news/developing-computer-use

[2] [99] [100] [104] [124] Computer-Using Agent | OpenAI

https://openai.com/index/computer-using-agent/

[4] [5] [12] [13] [73] [74] Harvey AI vs OpenAI Operator | Which AI Agents Wins
In 2025?

https://www.selecthub.com/ai-agent-tools/harvey-ai-vs-openai-operator/

[6] [19] [44] [45] [46] [60] [75] [76] [106] [109] Initial explorations of
Anthropic’s new Computer Use capability

https://simonwillison.net/2024/Oct/22/computer-use/

[8] [9] [26] [52] [102] Disrupting the first reported AI-orchestrated cyber
espionage campaign \ Anthropic

https://www.anthropic.com/news/disrupting-AI-espionage

[10] [24] [33] [41] [51] [62] [78] [79] [84] [86] [88] Introducing computer use,
a new Claude 3.5 Sonnet, and Claude 3.5 Haiku \ Anthropic

https://www.anthropic.com/news/3-5-models-and-computer-use

[11] [20] [21] [22] [28] [29] [32] [34] [35] [36] [47] [61] [64] [65] [70] [77]
[80] [81] [85] [96] [98] [103] [105] Introducing Operator | OpenAI

https://openai.com/index/introducing-operator/

[14] [15] [16] [31] [63] [66] [67] Why UiPath’s Daniel Dines isn’t worried about
OpenAI or Anthropic | Sifted

https://sifted.eu/articles/ui-path-agents

[17] [18] [23] [72] OpenAI Operator x NetSuite : r/Netsuite

https://www.reddit.com/r/Netsuite/comments/1iemvrg/openai_operator_x_netsuite/

[25] [27] [53] Chinese hackers used Anthropic's Claude AI agent to automate
spying

https://www.axios.com/2025/11/13/anthropic-china-claude-code-cyberattack

[30] [54] [55] [93] [94] OpenAI launches Operator—an agent that can use a
computer for you : r/OpenAI

https://www.reddit.com/r/OpenAI/comments/1i89lt0/openai_launches_operatoran_agent_that_can_use_a/

[39] AI Agents Market Size, Share & Trends - MarketsandMarkets

https://www.marketsandmarkets.com/Market-Reports/ai-agents-market-15761548.html

[40] [92] AI Agents Market Size And Share | Industry Report, 2033

https://www.grandviewresearch.com/industry-analysis/ai-agents-market-report

[48] [2402.04615] ScreenAI: A Vision-Language Model for UI and ... - arXiv

https://arxiv.org/abs/2402.04615

[49] ScreenAI: A visual language model for UI and visually-situated ...

https://research.google/blog/screenai-a-visual-language-model-for-ui-and-visually-situated-language-understanding/

[50] GPT-5-based agentic frameworks have reached nearly 70% on ...

https://www.reddit.com/r/singularity/comments/1nyqmhv/gpt5based_agentic_frameworks_have_reached_nearly/

[56] [57] [58] [59] [95] Computer use | OpenAI API

https://platform.openai.com/docs/guides/tools-computer-use

[68] [69] [90] [91] [97] Automation Anywhere Announces Availability of Agents in
the New AWS Marketplace AI Agents and Tools Category

https://www.prnewswire.com/news-releases/automation-anywhere-announces-availability-of-agents-in-the-new-aws-marketplace-ai-agents-and-tools-category-302507015.html

[101] [123] What happens when AI agents score 100% in computing ... - Citrix

https://www.citrix.com/blogs/2025/07/24/what-happens-when-ai-agents-score-100-in-computing-using-benchmarks/?srsltid=AfmBOorTKBqonU0je-RbrLxxhWauygr5QqFsJhYJw9vjQ2KDvhlgULeJ

[110] How to use Project Mariner - Google Labs Help

https://support.google.com/labs/answer/16270604?hl=en

[111] Google Mariner 2025: Web Agent Complete Guide | Local AI Master

https://localaimaster.com/blog/google-project-mariner-web-agent-2025

[112] Project Mariner: A Guide With Five Practical Examples - DataCamp

https://www.datacamp.com/tutorial/project-mariner

[113] Leveraging Open-Interpreter: AI-Driven Automated Coding with ...

https://becomingahacker.org/leveraging-open-interpreter-ai-driven-automated-coding-with-code-llama-and-gpt-4-5361b944fa0

[114] Open Interpreter: Running LLM Code Locally and Safely | Brandeploy

https://www.brandeploy.io/en-open-interpreter/

[115] Will AutoGPT-style AI Agents mostly work before the end of 2024?

https://manifold.markets/ahalekelly/will-ai-agents-mostly-work-before-t

[116] [117] [118] [119] [120] [121] [122] 10 best AI agent platforms & companies
I’m using in 2025 | Marketer Milk

https://www.marketermilk.com/blog/best-ai-agent-platforms
