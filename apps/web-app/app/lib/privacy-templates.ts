export type PrivacyTemplate = 'uk' | 'eu' | 'us' | 'global'

interface PrivacyVars {
  legalName: string
  boardName: string
  contactEmail: string
  websiteUrl: string
}

function fill(template: string, vars: PrivacyVars): string {
  return template
    .replace(/\{\{LEGAL_NAME\}\}/g, vars.legalName)
    .replace(/\{\{BOARD_NAME\}\}/g, vars.boardName)
    .replace(/\{\{CONTACT_EMAIL\}\}/g, vars.contactEmail)
    .replace(/\{\{WEBSITE_URL\}\}/g, vars.websiteUrl)
}

const UK_TEMPLATE = `
<h2>Privacy Policy</h2>
<p><strong>{{LEGAL_NAME}}</strong> ("we", "us", "our") operates {{BOARD_NAME}} at {{WEBSITE_URL}}. This policy explains how we collect, use, and protect your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>

<h3>1. Who we are</h3>
<p>The data controller is <strong>{{LEGAL_NAME}}</strong>. To exercise any of your rights or ask questions about how we handle your data, contact us at <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>.</p>

<h3>2. What data we collect</h3>
<ul>
  <li>Information you provide when applying for a role (name, email address, CV, cover letter)</li>
  <li>Account information if you register on our platform</li>
  <li>Usage data collected via cookies and analytics tools</li>
  <li>Communications you send us</li>
</ul>

<h3>3. Legal basis for processing</h3>
<p>We process your data on the following lawful bases under UK GDPR Article 6:</p>
<ul>
  <li><strong>Contract</strong> – to process your job application or manage your account</li>
  <li><strong>Legitimate interests</strong> – to operate and improve the platform, prevent fraud, and communicate relevant opportunities</li>
  <li><strong>Consent</strong> – where you have opted in to marketing communications</li>
  <li><strong>Legal obligation</strong> – where we are required by law</li>
</ul>

<h3>4. How we use your data</h3>
<ul>
  <li>To process and manage job applications</li>
  <li>To operate, maintain, and improve the job board</li>
  <li>To send you notifications and updates you have requested</li>
  <li>To comply with our legal obligations</li>
</ul>

<h3>5. Sharing your data</h3>
<p>We do not sell your personal data. We may share it with:</p>
<ul>
  <li>Employers or hiring organisations to whom you apply</li>
  <li>Service providers acting as data processors on our behalf (e.g. hosting, email)</li>
  <li>Authorities where required by law</li>
</ul>

<h3>6. Retention</h3>
<p>We retain application data for up to 12 months after a role is closed, or for as long as you maintain an account with us. You may request deletion at any time.</p>

<h3>7. Your rights</h3>
<p>Under UK GDPR you have the right to: access your data; correct inaccuracies; request erasure; restrict or object to processing; data portability; and to withdraw consent at any time. To exercise any right contact <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>.</p>

<h3>8. Cookies</h3>
<p>We use essential cookies to operate the platform and, where you consent, analytics cookies to understand usage. You can manage cookie preferences at any time via our cookie banner.</p>

<h3>9. Changes to this policy</h3>
<p>We may update this policy from time to time. Material changes will be notified by email or a prominent notice on the site. Last updated: ${new Date().getFullYear()}.</p>
`

const EU_TEMPLATE = `
<h2>Privacy Policy</h2>
<p><strong>{{LEGAL_NAME}}</strong> ("we", "us", "our") operates {{BOARD_NAME}} at {{WEBSITE_URL}}. This policy describes how we process personal data in accordance with Regulation (EU) 2016/679 (GDPR).</p>

<h3>1. Controller</h3>
<p><strong>{{LEGAL_NAME}}</strong> is the data controller. Contact: <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>.</p>

<h3>2. Data we collect (Article 13 / 14 GDPR)</h3>
<ul>
  <li>Identity and contact data: name, email address</li>
  <li>Application data: CV, cover letter, work history</li>
  <li>Account data where applicable</li>
  <li>Technical data: IP address, browser type, usage logs</li>
</ul>

<h3>3. Purposes and legal bases (Article 6 GDPR)</h3>
<ul>
  <li><strong>Performance of a contract (Art. 6(1)(b))</strong> – to process applications and manage accounts</li>
  <li><strong>Legitimate interests (Art. 6(1)(f))</strong> – platform operation, security, fraud prevention, and service improvement</li>
  <li><strong>Consent (Art. 6(1)(a))</strong> – marketing communications and non-essential cookies</li>
  <li><strong>Legal obligation (Art. 6(1)(c))</strong> – compliance with applicable law</li>
</ul>

<h3>4. Recipients</h3>
<p>Your data may be shared with: employers to whom you apply; processors providing hosting, email, and analytics services under Data Processing Agreements; and public authorities where legally required. We do not sell personal data.</p>

<h3>5. International transfers</h3>
<p>Where personal data is transferred outside the EEA we ensure adequate safeguards are in place, such as Standard Contractual Clauses approved by the European Commission.</p>

<h3>6. Retention periods</h3>
<p>Application data is kept for up to 12 months after role closure. Account data is kept for the duration of your account plus 30 days after deletion.</p>

<h3>7. Your rights (Articles 15–22 GDPR)</h3>
<p>You have the right to: access (Art. 15); rectification (Art. 16); erasure (Art. 17); restriction (Art. 18); data portability (Art. 20); object (Art. 21); and not to be subject to solely automated decisions (Art. 22). To exercise any right email <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>. You may also lodge a complaint with your national supervisory authority.</p>

<h3>8. Cookies</h3>
<p>We use essential cookies (no consent required) and, where you consent, analytics and marketing cookies. You may withdraw consent at any time via our cookie settings.</p>

<h3>9. Updates</h3>
<p>This policy may be updated. We will notify you of material changes. Last reviewed: ${new Date().getFullYear()}.</p>
`

const US_TEMPLATE = `
<h2>Privacy Policy</h2>
<p><strong>{{LEGAL_NAME}}</strong> ("we", "us", "our") operates {{BOARD_NAME}} at {{WEBSITE_URL}}. This Privacy Policy describes how we collect, use, disclose, and safeguard your information. If you are a California resident, please also see the CCPA section below.</p>

<h3>1. Information we collect</h3>
<ul>
  <li><strong>Information you provide:</strong> name, email address, résumé, cover letter, and other application materials</li>
  <li><strong>Account information:</strong> username, password (hashed), preferences</li>
  <li><strong>Usage data:</strong> pages visited, search queries, referring URLs, browser/device type, IP address</li>
  <li><strong>Communications:</strong> messages you send us</li>
</ul>

<h3>2. How we use your information</h3>
<ul>
  <li>To operate and improve the job board</li>
  <li>To process and forward job applications to employers</li>
  <li>To communicate with you about your account or applications</li>
  <li>To send marketing communications where you have opted in</li>
  <li>To comply with legal obligations and protect our rights</li>
</ul>

<h3>3. Sharing your information</h3>
<p>We do not sell your personal information. We may share it with:</p>
<ul>
  <li>Employers and hiring organisations to whom you apply</li>
  <li>Service providers (hosting, email, analytics) under confidentiality obligations</li>
  <li>Law enforcement or courts when required by law or to protect safety</li>
  <li>A successor entity in the event of a merger or acquisition</li>
</ul>

<h3>4. Cookies and tracking</h3>
<p>We use cookies and similar technologies. You may adjust browser settings to decline cookies, though some features may not function correctly. Where applicable, we honour Do Not Track signals.</p>

<h3>5. California Privacy Rights (CCPA / CPRA)</h3>
<p>California residents have the right to: know what personal information we collect and how it is used; delete personal information we hold about them; opt out of the sale or sharing of personal information (we do not sell or share personal information); and non-discrimination for exercising these rights. To submit a verifiable request, email <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>.</p>

<h3>6. Data retention</h3>
<p>We retain application data for up to 12 months after a role closes, or for as long as you maintain an account. You may request deletion at any time.</p>

<h3>7. Security</h3>
<p>We use industry-standard measures to protect your data. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security.</p>

<h3>8. Children</h3>
<p>Our service is not directed to children under 16. We do not knowingly collect personal information from anyone under 16.</p>

<h3>9. Contact</h3>
<p>Questions about this policy? Email <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>.</p>

<h3>10. Changes</h3>
<p>We may update this policy. We will post the revised policy on this page with an updated effective date. Last updated: ${new Date().getFullYear()}.</p>
`

const GLOBAL_TEMPLATE = `
<h2>Privacy Policy</h2>
<p><strong>{{LEGAL_NAME}}</strong> ("we", "us", "our") operates {{BOARD_NAME}} at {{WEBSITE_URL}}. This policy explains how we collect, use, and protect your personal information.</p>

<h3>1. Who we are</h3>
<p>The operator of this job board is <strong>{{LEGAL_NAME}}</strong>. For privacy enquiries contact <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>.</p>

<h3>2. Information we collect</h3>
<ul>
  <li>Information you provide when applying for roles (name, email, CV, cover letter)</li>
  <li>Account details if you register</li>
  <li>Usage data (pages visited, search terms, browser type, IP address)</li>
</ul>

<h3>3. How we use it</h3>
<ul>
  <li>To process job applications and forward them to employers</li>
  <li>To operate and improve the platform</li>
  <li>To send notifications you have requested</li>
  <li>To meet legal requirements</li>
</ul>

<h3>4. Sharing</h3>
<p>We share your data only with employers you apply to, service providers who help us operate the platform, and authorities when required by law. We do not sell your data.</p>

<h3>5. Your rights</h3>
<p>Depending on where you are located you may have rights to access, correct, delete, or port your data, and to object to or restrict certain processing. Email <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a> to exercise any right.</p>

<h3>6. Cookies</h3>
<p>We use essential cookies to operate the site and, with your consent, analytics cookies. You can manage preferences via our cookie banner.</p>

<h3>7. Retention</h3>
<p>We keep application data for up to 12 months after a role closes. You may request deletion at any time.</p>

<h3>8. Security</h3>
<p>We take reasonable steps to protect your information but cannot guarantee the security of data transmitted over the internet.</p>

<h3>9. Changes</h3>
<p>We may revise this policy. Material changes will be communicated via the site. Last updated: ${new Date().getFullYear()}.</p>
`

const TEMPLATES: Record<PrivacyTemplate, string> = {
  uk: UK_TEMPLATE,
  eu: EU_TEMPLATE,
  us: US_TEMPLATE,
  global: GLOBAL_TEMPLATE,
}

export function renderPrivacyPolicy(template: PrivacyTemplate, vars: PrivacyVars): string {
  return fill(TEMPLATES[template], vars)
}

export const TEMPLATE_LABELS: Record<PrivacyTemplate, string> = {
  uk:     'United Kingdom (UK GDPR / DPA 2018)',
  eu:     'European Union (GDPR)',
  us:     'United States (incl. CCPA / CPRA)',
  global: 'Global / General',
}
