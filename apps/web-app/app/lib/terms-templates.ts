export type TermsTemplate = 'uk' | 'eu' | 'us' | 'global'

interface TermsVars {
  legalName: string
  boardName: string
  contactEmail: string
  websiteUrl: string
}

function fill(template: string, vars: TermsVars): string {
  return template
    .replace(/\{\{LEGAL_NAME\}\}/g, vars.legalName)
    .replace(/\{\{BOARD_NAME\}\}/g, vars.boardName)
    .replace(/\{\{CONTACT_EMAIL\}\}/g, vars.contactEmail)
    .replace(/\{\{WEBSITE_URL\}\}/g, vars.websiteUrl)
}

const UK_TEMPLATE = `
<h2>Terms of Service</h2>
<p>These Terms of Service ("Terms") govern your use of {{BOARD_NAME}} operated by <strong>{{LEGAL_NAME}}</strong> at {{WEBSITE_URL}}. By accessing or using this platform, you agree to be bound by these Terms.</p>

<h3>1. Use of the Platform</h3>
<p>You agree to use this platform only for lawful purposes and in a way that does not infringe the rights of others or restrict their use and enjoyment of the platform. Prohibited behavior includes:</p>
<ul>
  <li>Harassing or causing distress or inconvenience to any person</li>
  <li>Obscene or offensive content or language</li>
  <li>Disrupting normal flow of dialogue within the platform</li>
  <li>Attempting to gain unauthorised access to our systems</li>
</ul>

<h3>2. Intellectual Property Rights</h3>
<p>The content and materials on this platform, including text, graphics, logos, and images, are the property of {{LEGAL_NAME}} or are used with permission. You may not reproduce, distribute, or transmit any content without our prior written consent.</p>

<h3>3. Limitation of Liability</h3>
<p><strong>To the maximum extent permitted by law:</strong></p>
<ul>
  <li>{{LEGAL_NAME}} shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the platform</li>
  <li>{{LEGAL_NAME}} does not guarantee that the platform will be uninterrupted, error-free, or free from viruses or other harmful components</li>
  <li>{{LEGAL_NAME}} makes no warranties regarding the accuracy, completeness, or reliability of job listings or candidate profiles</li>
  <li>Job applicants and employers use the platform at their own risk</li>
</ul>

<h3>4. No Responsibility for Content</h3>
<p>{{LEGAL_NAME}} does not review, verify, or endorse job listings or candidate information. We are not responsible for the accuracy, legality, or suitability of any job opportunity or applicant profile. Users are responsible for verifying information and conducting appropriate due diligence.</p>

<h3>5. Availability and Service Disruptions</h3>
<p>While we aim to maintain continuous service, {{LEGAL_NAME}} does not warrant that the platform will always be available without interruption. We are not liable for any loss or damage caused by service outages, maintenance, or technical failures.</p>

<h3>6. User-Generated Content</h3>
<p>By submitting content to this platform (including CVs, cover letters, or job descriptions), you grant {{LEGAL_NAME}} a worldwide, non-exclusive license to use, reproduce, and display such content. You represent that you have the right to grant these permissions.</p>

<h3>7. Disclaimer of Warranties</h3>
<p>The platform is provided "as is" without any warranties, express or implied. {{LEGAL_NAME}} disclaims all warranties including merchantability, fitness for a particular purpose, and non-infringement.</p>

<h3>8. Changes to Terms</h3>
<p>{{LEGAL_NAME}} reserves the right to modify these Terms at any time. Your continued use of the platform constitutes acceptance of updated Terms.</p>

<h3>9. Governing Law</h3>
<p>These Terms are governed by the laws of the United Kingdom. Any disputes shall be resolved in the courts of the United Kingdom.</p>

<h3>10. Contact</h3>
<p>For questions about these Terms, contact us at <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>.</p>
`

const EU_TEMPLATE = `
<h2>Terms of Service</h2>
<p>These Terms of Service ("Terms") govern your use of {{BOARD_NAME}} operated by <strong>{{LEGAL_NAME}}</strong> at {{WEBSITE_URL}}. By accessing or using this platform, you agree to be bound by these Terms.</p>

<h3>1. Use of the Platform</h3>
<p>You agree to use this platform only for lawful purposes and in compliance with all applicable EU and national laws. You agree not to use the platform in any way that:</p>
<ul>
  <li>Violates any applicable law or regulation</li>
  <li>Infringes the rights of others</li>
  <li>Contains harmful, obscene, or offensive content</li>
  <li>Attempts to gain unauthorised access to systems</li>
</ul>

<h3>2. Intellectual Property Rights</h3>
<p>All content and materials on this platform are protected by intellectual property laws. You may not copy, modify, distribute, or transmit any content without prior written permission from {{LEGAL_NAME}}.</p>

<h3>3. Limitation of Liability</h3>
<p><strong>To the maximum extent permitted by EU law:</strong></p>
<ul>
  <li>{{LEGAL_NAME}} shall not be liable for any indirect, incidental, special, or consequential damages</li>
  <li>{{LEGAL_NAME}} does not guarantee uninterrupted or error-free service</li>
  <li>{{LEGAL_NAME}} is not responsible for the accuracy or completeness of job listings or candidate profiles</li>
  <li>Users assume all risk associated with using this platform</li>
</ul>

<h3>4. No Responsibility for Content</h3>
<p>{{LEGAL_NAME}} does not verify or endorse any job listings or candidate information. We are not liable for inaccurate, misleading, or illegal content. You are responsible for verifying all information before taking action.</p>

<h3>5. Service Availability</h3>
<p>While we strive to provide continuous service, {{LEGAL_NAME}} does not guarantee availability. We are not liable for losses caused by service interruptions, maintenance, or technical issues.</p>

<h3>6. User-Generated Content</h3>
<p>By submitting content to this platform, you grant {{LEGAL_NAME}} a worldwide, perpetual license to use, reproduce, and display it. You certify that you have the legal right to grant these rights.</p>

<h3>7. Disclaimer of Warranties</h3>
<p>The platform is provided "as is" without warranties. {{LEGAL_NAME}} disclaims all warranties including fitness for a particular purpose.</p>

<h3>8. Data Protection</h3>
<p>Use of this platform is subject to our Privacy Policy. By using the platform, you consent to our processing of your personal data as described in our Privacy Policy, which complies with GDPR and applicable data protection laws.</p>

<h3>9. Applicable Law</h3>
<p>These Terms are governed by EU law and the law of the EU member state where {{LEGAL_NAME}} is established.</p>

<h3>10. Contact</h3>
<p>For questions about these Terms, contact us at <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>.</p>
`

const US_TEMPLATE = `
<h2>Terms of Service</h2>
<p>These Terms of Service ("Terms") are entered into by and between you ("User") and <strong>{{LEGAL_NAME}}</strong> ("Company") and govern your use of {{BOARD_NAME}} located at {{WEBSITE_URL}}. By accessing and using this platform, you accept and agree to be bound by and comply with these Terms.</p>

<h3>1. Use License</h3>
<p>You agree to use this platform only for lawful purposes and in a way that does not:</p>
<ul>
  <li>Infringe upon the rights of others</li>
  <li>Restrict or inhibit anyone's use or enjoyment of the platform</li>
  <li>Contain obscene, offensive, or sexually explicit material</li>
  <li>Attempt to gain unauthorised access to the platform or related systems</li>
</ul>

<h3>2. Intellectual Property Rights</h3>
<p>Unless otherwise stated, {{LEGAL_NAME}} owns the intellectual property rights for all material on this platform. All intellectual property rights are reserved. You may access this content for personal non-commercial use, but you may not reproduce or distribute content without prior written consent.</p>

<h3>3. Disclaimer of Warranties</h3>
<p>The platform is provided on an "as is" and "as available" basis. {{LEGAL_NAME}} makes no warranties, expressed or implied, regarding the platform. {{LEGAL_NAME}} specifically disclaims implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>

<h3>4. Limitation of Liability</h3>
<p><strong>In no event shall {{LEGAL_NAME}} be liable to you for damages of any kind, including:</strong></p>
<ul>
  <li>Lost profits, lost revenue, or lost opportunity</li>
  <li>Indirect, incidental, special, or consequential damages</li>
  <li>Damages for loss of data, business interruption, or computer failure</li>
  <li>Any other commercial damages or losses, even if advised of their possibility</li>
</ul>

<h3>5. No Responsibility for Content</h3>
<p>{{LEGAL_NAME}} does not control, verify, or take responsibility for any content posted by users, including job listings and candidate profiles. We are not liable for the accuracy, completeness, or legality of any job opportunity or applicant information.</p>

<h3>6. Service Disruptions</h3>
<p>{{LEGAL_NAME}} is not responsible for any service interruptions, including maintenance, downtime, or technical failures. We do not guarantee that the platform will be uninterrupted or error-free.</p>

<h3>7. User-Generated Content</h3>
<p>By posting content to this platform, you grant {{LEGAL_NAME}} a worldwide, royalty-free license to use, reproduce, modify, and distribute your content. You represent that you own or have the legal right to grant this license.</p>

<h3>8. Indemnification</h3>
<p>You agree to indemnify and hold harmless {{LEGAL_NAME}} from any claims, damages, or losses arising from your use of the platform or violation of these Terms.</p>

<h3>9. Governing Law</h3>
<p>These Terms are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the federal and state courts located in the United States.</p>

<h3>10. Contact Information</h3>
<p>If you have questions about these Terms, please contact {{LEGAL_NAME}} at <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>.</p>
`

const GLOBAL_TEMPLATE = `
<h2>Terms of Service</h2>
<p>These Terms of Service ("Terms") govern your use of {{BOARD_NAME}} operated by <strong>{{LEGAL_NAME}}</strong> at {{WEBSITE_URL}}. By using this platform, you agree to these Terms.</p>

<h3>1. Acceptable Use</h3>
<p>You agree to use this platform only for lawful purposes. You will not:</p>
<ul>
  <li>Use the platform in any way that violates applicable law</li>
  <li>Infringe the rights of others</li>
  <li>Post illegal, threatening, abusive, defamatory, or offensive content</li>
  <li>Attempt to gain unauthorised access to the platform</li>
</ul>

<h3>2. Intellectual Property</h3>
<p>All content on this platform is protected by intellectual property law. You may not copy, modify, distribute, or transmit content without permission from {{LEGAL_NAME}}.</p>

<h3>3. Disclaimer of Warranties</h3>
<p>This platform is provided "as is" without warranties of any kind. {{LEGAL_NAME}} disclaims all implied warranties including merchantability and fitness for a particular purpose.</p>

<h3>4. Limitation of Liability</h3>
<p>{{LEGAL_NAME}} is not liable for indirect, incidental, special, or consequential damages arising from your use of this platform. This includes but is not limited to lost profits, lost data, or business interruption.</p>

<h3>5. No Verification of Content</h3>
<p>{{LEGAL_NAME}} does not verify job listings or candidate profiles. We are not responsible for the accuracy, completeness, or legality of any content. Users are responsible for verifying information independently.</p>

<h3>6. Service Availability</h3>
<p>{{LEGAL_NAME}} does not guarantee continuous or error-free service. We are not liable for any damages caused by service interruptions or technical failures.</p>

<h3>7. User Content License</h3>
<p>By submitting content to this platform, you grant {{LEGAL_NAME}} a worldwide license to use, reproduce, and display that content. You represent that you have the right to grant this license.</p>

<h3>8. Changes to Terms</h3>
<p>{{LEGAL_NAME}} may modify these Terms at any time. Your continued use of the platform constitutes acceptance of the updated Terms.</p>

<h3>9. Contact</h3>
<p>For questions about these Terms, contact <a href="mailto:{{CONTACT_EMAIL}}">{{CONTACT_EMAIL}}</a>.</p>
`

export const TEMPLATE_LABELS: Record<TermsTemplate, string> = {
  uk: 'United Kingdom (UK GDPR)',
  eu: 'European Union (GDPR)',
  us: 'United States',
  global: 'Global',
}

export function getTermsTemplate(template: TermsTemplate, vars: TermsVars): string {
  const baseTemplate = {
    uk: UK_TEMPLATE,
    eu: EU_TEMPLATE,
    us: US_TEMPLATE,
    global: GLOBAL_TEMPLATE,
  }[template]

  return fill(baseTemplate, vars)
}
