'use client'

import { useState } from 'react'

type LegalPage = 'terms' | 'privacy' | null

export function LegalModal({ page, onClose }: { page: LegalPage; onClose: () => void }) {
  if (!page) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-[16px] w-full max-w-[680px] max-h-[85vh] overflow-hidden z-10"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.30)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#999999] hover:text-[#36383A] transition-colors z-10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div
          className="p-6 pb-4 border-b border-[#E2EAF1]"
          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
        >
          <h2 className="text-[22px] font-bold text-white" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            {page === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </h2>
          <p className="text-[13px] text-white/80 mt-1">
            Last updated: May 19, 2026
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)] prose-legal">
          {page === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>
      </div>
    </div>
  )
}

function TermsContent() {
  return (
    <div className="space-y-6 text-[14px] text-[#4B4B4B] leading-[1.8]">
      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">1. Acceptance of Terms</h3>
        <p>
          By accessing or using XoXoSurveys (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Platform. These Terms apply to all visitors, users, and others who access or use the Platform.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">2. Eligibility</h3>
        <p>
          You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to use the Platform. By using the Platform, you represent and warrant that you meet the eligibility requirements. If you are using the Platform on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">3. Account Registration</h3>
        <p>
          To access certain features of the Platform, you must create an account. You agree to:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Provide accurate, current, and complete information during registration</li>
          <li>Maintain and promptly update your account information to keep it accurate</li>
          <li>Maintain the security and confidentiality of your login credentials</li>
          <li>Accept responsibility for all activities that occur under your account</li>
          <li>Notify us immediately of any unauthorized use of your account</li>
        </ul>
        <p className="mt-2">
          You may not create multiple accounts, use another person&apos;s account, or share your account credentials with others.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">4. Survey Participation &amp; Earnings</h3>
        <p>
          XoXoSurveys provides access to surveys and offers from third-party providers. By participating in surveys:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>You agree to provide honest, truthful, and thoughtful responses</li>
          <li>Earnings are credited to your account balance upon successful completion of surveys</li>
          <li>We reserve the right to adjust or reverse earnings if survey responses are found to be fraudulent, inconsistent, or completed in bad faith</li>
          <li>Survey availability, rewards, and qualification criteria are determined by third-party providers and may change without notice</li>
          <li>We do not guarantee that you will qualify for or complete any specific survey</li>
        </ul>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">5. Cashout &amp; Payments</h3>
        <p>
          You may request a cashout of your earned balance subject to the following conditions:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Minimum cashout amount is $5.00 USD</li>
          <li>A reserve amount of $2.00 per $5.00 withdrawn is held during the review period and released upon approval</li>
          <li>Cashout processing may take 24-48 hours</li>
          <li>You must verify your email address before requesting a cashout</li>
          <li>Payments are made via the method selected at the time of cashout (Binance Pay, Litecoin, PayPal, Amazon Gift Card, Google Play)</li>
          <li>We are not responsible for incorrect payment details provided by you</li>
        </ul>
        <p className="mt-2">
          All earnings and cashout amounts are displayed in USD. We reserve the right to delay or deny cashout requests suspected of fraud or violation of these Terms.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">6. Milestone Rewards</h3>
        <p>
          XoXoSurveys offers milestone rewards for completing a certain number of surveys. Milestone rewards are subject to change. Rewards must be claimed manually and will be added to your account balance upon claiming. We reserve the right to modify milestone thresholds and reward amounts.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">7. Referral Program</h3>
        <p>
          You may invite others to join XoXoSurveys using your unique referral code. You will earn a commission (currently 10%) on the survey earnings of users you refer. Referral commissions are subject to change. Abuse of the referral system, including self-referrals or creating multiple accounts, is strictly prohibited.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">8. Prohibited Conduct</h3>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Provide false, misleading, or inconsistent survey responses</li>
          <li>Use bots, scripts, or automated tools to complete surveys</li>
          <li>Create multiple accounts or use another person&apos;s identity</li>
          <li>Use VPNs, proxies, or Tor to misrepresent your location</li>
          <li>Attempt to manipulate or exploit the Platform&apos;s systems</li>
          <li>Reverse-engineer, decompile, or disassemble any part of the Platform</li>
          <li>Engage in any activity that could damage, disable, or impair the Platform</li>
          <li>Violate any applicable local, state, national, or international law</li>
        </ul>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">9. Anti-Fraud Measures</h3>
        <p>
          We employ automated and manual systems to detect fraudulent activity, including but not limited to VPN/proxy detection, response pattern analysis, completion speed analysis, device fingerprinting, and IP monitoring. Accounts suspected of fraud may be flagged, placed under review, or permanently suspended. We reserve the right to withhold earnings and deny cashouts for accounts involved in fraudulent activity.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">10. Account Suspension &amp; Termination</h3>
        <p>
          We reserve the right to suspend or terminate your account at any time, with or without notice, for:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Violation of these Terms</li>
          <li>Fraudulent or suspicious activity</li>
          <li>Misrepresentation of identity or location</li>
          <li>Abuse of the referral system</li>
          <li>Any conduct that we deem harmful to the Platform or other users</li>
        </ul>
        <p className="mt-2">
          Upon termination, any unpaid earnings may be forfeited at our discretion.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">11. Intellectual Property</h3>
        <p>
          All content, features, and functionality of the Platform — including but not limited to text, graphics, logos, icons, images, and software — are the exclusive property of XoXoSurveys and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content on the Platform without our prior written consent.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">12. Disclaimer of Warranties</h3>
        <p>
          THE PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">13. Limitation of Liability</h3>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, XOXOSURVEYS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE PLATFORM.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">14. Changes to Terms</h3>
        <p>
          We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting on the Platform. Your continued use of the Platform after any changes constitutes your acceptance of the new Terms. We encourage you to review these Terms periodically.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">15. Governing Law</h3>
        <p>
          These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions. Any disputes arising under these Terms shall be resolved through good-faith negotiation or, if necessary, through binding arbitration.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">16. Contact Us</h3>
        <p>
          If you have questions about these Terms, please contact us through the Help section on the Platform or email us at support@xoxosurveys.com.
        </p>
      </section>
    </div>
  )
}

function PrivacyContent() {
  return (
    <div className="space-y-6 text-[14px] text-[#4B4B4B] leading-[1.8]">
      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">1. Introduction</h3>
        <p>
          XoXoSurveys (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform. Please read this Privacy Policy carefully. By using the Platform, you consent to the data practices described in this policy.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">2. Information We Collect</h3>

        <h4 className="text-[14px] font-semibold text-[#36383A] mt-3 mb-1">Personal Information</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account Information:</strong> Email address, name (optional), and password (hashed)</li>
          <li><strong>Payment Information:</strong> Binance ID, Litecoin wallet address, PayPal email, or other payment details you provide for cashout</li>
          <li><strong>Referral Information:</strong> Your referral code and referral relationships</li>
        </ul>

        <h4 className="text-[14px] font-semibold text-[#36383A] mt-3 mb-1">Technical Information</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Device Information:</strong> Browser type, operating system, device type, screen resolution</li>
          <li><strong>Device Fingerprint:</strong> A unique identifier generated from your device characteristics for fraud prevention</li>
          <li><strong>IP Address:</strong> Your internet protocol address, used for location estimation and security</li>
          <li><strong>Log Data:</strong> Login timestamps, page views, and interaction patterns</li>
        </ul>

        <h4 className="text-[14px] font-semibold text-[#36383A] mt-3 mb-1">Survey Data</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Survey Responses:</strong> Your answers to survey questions, collected by our third-party survey providers</li>
          <li><strong>Survey Metadata:</strong> Completion status, time spent, and reward amounts</li>
        </ul>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">3. How We Use Your Information</h3>
        <p>We use the information we collect for the following purposes:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Account Management:</strong> To create and manage your account, verify your identity, and process cashout requests</li>
          <li><strong>Service Delivery:</strong> To provide, operate, and maintain the Platform, including survey matching and reward distribution</li>
          <li><strong>Fraud Prevention:</strong> To detect and prevent fraudulent activity, including VPN/proxy detection, bot detection, and response pattern analysis</li>
          <li><strong>Security:</strong> To protect your account and the Platform from unauthorized access and security threats</li>
          <li><strong>Communication:</strong> To send you account-related notifications, verification emails, and important updates about the Platform</li>
          <li><strong>Analytics:</strong> To analyze usage patterns and improve the Platform&apos;s functionality and user experience</li>
          <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
        </ul>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">4. How We Share Your Information</h3>
        <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Survey Providers:</strong> Your anonymized survey responses are shared with the survey providers (CPX Research, Bitlabs, Inbrain, RevToo, etc.) for research purposes. Your identity is not disclosed to these providers unless necessary for survey qualification</li>
          <li><strong>Payment Processors:</strong> Payment details you provide (Binance ID, wallet address, PayPal email) are used solely to process your cashout requests</li>
          <li><strong>Service Providers:</strong> We may share information with third-party service providers who assist in operating the Platform (e.g., email delivery, database hosting)</li>
          <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or governmental regulation</li>
          <li><strong>Safety &amp; Fraud:</strong> We may share information to protect against fraud, security threats, or violations of our Terms</li>
        </ul>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">5. Data Storage &amp; Security</h3>
        <p>
          Your data is stored on secure servers with industry-standard encryption and security measures. We implement the following safeguards:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Passwords are hashed using bcrypt and never stored in plain text</li>
          <li>SSL/TLS encryption for all data in transit</li>
          <li>Database encryption at rest</li>
          <li>Access controls and authentication for internal systems</li>
          <li>Regular security assessments and monitoring</li>
        </ul>
        <p className="mt-2">
          While we strive to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">6. Data Retention</h3>
        <p>
          We retain your personal information for as long as your account is active or as needed to provide you services. If you wish to delete your account, you may contact us at support@xoxosurveys.com. We may retain certain information as required by law or for legitimate business purposes, such as resolving disputes, enforcing our agreements, and complying with legal obligations.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">7. Cookies &amp; Tracking</h3>
        <p>
          The Platform uses essential cookies and similar technologies to maintain your session and provide core functionality. We do not use advertising cookies or third-party tracking pixels. We may use analytics tools to understand usage patterns and improve the Platform.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">8. Your Rights</h3>
        <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data</li>
          <li><strong>Portability:</strong> Request transfer of your data in a machine-readable format</li>
          <li><strong>Objection:</strong> Object to the processing of your data for certain purposes</li>
          <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
        </ul>
        <p className="mt-2">
          To exercise any of these rights, please contact us at support@xoxosurveys.com. We will respond to your request within 30 days.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">9. Children&apos;s Privacy</h3>
        <p>
          The Platform is not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information promptly.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">10. International Data Transfers</h3>
        <p>
          Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using the Platform, you consent to the transfer of your information to these countries, and we will take appropriate measures to ensure your data remains protected.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">11. Third-Party Links</h3>
        <p>
          The Platform may contain links to third-party websites or services, including survey provider websites. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party services you access through the Platform.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">12. Changes to This Policy</h3>
        <p>
          We may update this Privacy Policy from time to time. Changes will be effective immediately upon posting on the Platform. We will notify you of material changes via email or a prominent notice on the Platform. Your continued use of the Platform after changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h3 className="text-[16px] font-bold text-[#36383A] mb-2">13. Contact Us</h3>
        <p>
          If you have questions about this Privacy Policy or your personal data, please contact us:
        </p>
        <ul className="list-none pl-0 space-y-1 mt-2">
          <li><strong>Through the Platform:</strong> Help &amp; Support section</li>
          <li><strong>Email:</strong> support@xoxosurveys.com</li>
        </ul>
      </section>
    </div>
  )
}
