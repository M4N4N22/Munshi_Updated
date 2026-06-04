"use client";

import { Card } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-slate-600">Munshi Dada</p>
          <p className="text-sm text-slate-500 mt-2">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8 p-6 bg-white border-slate-200">
          <p className="text-slate-700 leading-relaxed">
            Munshi Dada is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your
            information when you use our WhatsApp-based chatbot platform
            designed to help manage factory workers and tasks.
          </p>
        </Card>

        {/* Table of Contents */}
        <Card className="mb-8 p-6 bg-white border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Table of Contents
          </h2>
          <ul className="space-y-2 text-slate-700">
            <li>
              <a
                href="#information-we-collect"
                className="text-blue-600 hover:underline"
              >
                1. Information We Collect
              </a>
            </li>
            <li>
              <a href="#how-we-use" className="text-blue-600 hover:underline">
                2. How We Use Your Information
              </a>
            </li>
            <li>
              <a href="#data-sharing" className="text-blue-600 hover:underline">
                3. Data Sharing and Disclosure
              </a>
            </li>
            <li>
              <a
                href="#data-security"
                className="text-blue-600 hover:underline"
              >
                4. Data Security
              </a>
            </li>
            <li>
              <a
                href="#data-retention"
                className="text-blue-600 hover:underline"
              >
                5. Data Retention
              </a>
            </li>
            <li>
              <a href="#user-rights" className="text-blue-600 hover:underline">
                6. Your Rights
              </a>
            </li>
            <li>
              <a href="#whatsapp" className="text-blue-600 hover:underline">
                7. WhatsApp Integration
              </a>
            </li>
            <li>
              <a href="#contact" className="text-blue-600 hover:underline">
                8. Contact Us
              </a>
            </li>
          </ul>
        </Card>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Section 1 */}
          <Card
            className="p-6 bg-white border-slate-200"
            id="information-we-collect"
          >
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              1. Information We Collect
            </h2>
            <div className="space-y-4 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  a) Attendance and Presence Data
                </h3>
                <p className="leading-relaxed">
                  We collect information about your attendance status, including
                  present/absent markings, timestamps, and dates. This data is
                  used to maintain accurate attendance records for factory
                  operations.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  b) Task-Related Information
                </h3>
                <p className="leading-relaxed">
                  We collect task assignments, task descriptions, completion
                  status, updates, and task IDs. This includes information about
                  which workers are assigned to specific tasks and their
                  progress.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  c) Issue and Problem Reports
                </h3>
                <p className="leading-relaxed">
                  We collect information about issues reported through our
                  platform, including issue descriptions, resolution status, and
                  issue IDs to help track and resolve workplace problems.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  d) Personal Identifiers
                </h3>
                <p className="leading-relaxed">
                  We collect WhatsApp phone numbers, worker names, employee IDs,
                  and other identifiers necessary to identify and manage workers
                  within your factory.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  e) Communication Data
                </h3>
                <p className="leading-relaxed">
                  We collect and process messages exchanged through the chatbot,
                  including commands, responses, and metadata about
                  communication frequency and timing.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  f) Device and Usage Information
                </h3>
                <p className="leading-relaxed">
                  We may collect information about the devices used to access
                  Munshi Dada, IP addresses, browser types, and usage patterns
                  to improve our service.
                </p>
              </div>
            </div>
          </Card>

          {/* Section 2 */}
          <Card className="p-6 bg-white border-slate-200" id="how-we-use">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              2. How We Use Your Information
            </h2>
            <div className="space-y-3 text-slate-700">
              <p>
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  Managing attendance records and monitoring worker presence
                </li>
                <li>Assigning, tracking, and completing factory tasks</li>
                <li>Documenting and resolving workplace issues</li>
                <li>Providing worker management and operational insights</li>
                <li>
                  Generating reports about factory operations and productivity
                </li>
                <li>Improving and optimizing our platform functionality</li>
                <li>
                  Ensuring compliance with legal and regulatory requirements
                </li>
                <li>
                  Communicating with you about your account and service updates
                </li>
                <li>Preventing fraud and enhancing platform security</li>
              </ul>
            </div>
          </Card>

          {/* Section 3 */}
          <Card className="p-6 bg-white border-slate-200" id="data-sharing">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              3. Data Sharing and Disclosure
            </h2>
            <div className="space-y-4 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  a) Within Your Organization
                </h3>
                <p className="leading-relaxed">
                  Your attendance, task, and issue data may be shared with
                  factory managers, supervisors, and administrators who need
                  access to manage operations and oversee workers.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  b) Service Providers
                </h3>
                <p className="leading-relaxed">
                  We may share your data with third-party service providers who
                  assist us in operating our platform, including hosting
                  providers, analytics providers, and WhatsApp service
                  providers.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  c) Legal Requirements
                </h3>
                <p className="leading-relaxed">
                  We may disclose your information when required by law, court
                  order, or government requests, or when necessary to protect
                  our legal rights or the safety of others.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  d) Business Transfers
                </h3>
                <p className="leading-relaxed">
                  If Munshi Dada is involved in a merger, acquisition,
                  bankruptcy, or sale of assets, your information may be
                  transferred as part of that transaction.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  e) Non-Sharing of Personal Data
                </h3>
                <p className="leading-relaxed">
                  We do not sell or share your personal data with third parties
                  for marketing purposes without your explicit consent.
                </p>
              </div>
            </div>
          </Card>

          {/* Section 4 */}
          <Card className="p-6 bg-white border-slate-200" id="data-security">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              4. Data Security
            </h2>
            <div className="space-y-4 text-slate-700">
              <p className="leading-relaxed">
                We implement appropriate technical and organizational security
                measures to protect your information against unauthorized
                access, alteration, disclosure, or destruction. These measures
                include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication mechanisms</li>
                <li>Regular security audits and testing</li>
                <li>Access controls and role-based permissions</li>
                <li>Secure backup and disaster recovery procedures</li>
              </ul>
              <p className="leading-relaxed mt-4">
                However, no security system is impenetrable. While we strive to
                protect your information, we cannot guarantee absolute security.
                You use Munshi Dada at your own risk.
              </p>
            </div>
          </Card>

          {/* Section 5 */}
          <Card className="p-6 bg-white border-slate-200" id="data-retention">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              5. Data Retention
            </h2>
            <div className="space-y-4 text-slate-700">
              <p className="leading-relaxed">
                We retain your information for as long as necessary to provide
                our services, comply with legal obligations, and resolve
                disputes. Specifically:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  Attendance records are retained for at least 1 year for
                  compliance and auditing purposes
                </li>
                <li>
                  Task and project data are retained as long as needed for
                  operational reference
                </li>
                <li>
                  Issue reports are retained for resolution tracking and
                  learning
                </li>
                <li>
                  Account data is retained as long as your account is active
                </li>
                <li>
                  Communication logs may be retained for security and dispute
                  resolution
                </li>
              </ul>
              <p className="leading-relaxed mt-4">
                After the retention period, we securely delete or anonymize your
                information unless longer retention is required by law.
              </p>
            </div>
          </Card>

          {/* Section 6 */}
          <Card className="p-6 bg-white border-slate-200" id="user-rights">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              6. Your Rights
            </h2>
            <div className="space-y-4 text-slate-700">
              <p className="leading-relaxed">
                Depending on your location, you may have certain rights
                regarding your personal information:
              </p>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  a) Right to Access
                </h3>
                <p className="leading-relaxed">
                  You have the right to request access to your personal data and
                  receive a copy of the information we hold about you.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  b) Right to Correction
                </h3>
                <p className="leading-relaxed">
                  You may request that we correct inaccurate or incomplete
                  information in our records.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  c) Right to Deletion
                </h3>
                <p className="leading-relaxed">
                  You may request deletion of your personal data, subject to
                  legal and operational requirements.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  d) Right to Data Portability
                </h3>
                <p className="leading-relaxed">
                  You may request your data in a portable format so you can
                  transfer it to another service provider.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  e) Right to Object
                </h3>
                <p className="leading-relaxed">
                  You may object to the processing of your data in certain
                  circumstances.
                </p>
              </div>
              <p className="leading-relaxed mt-4">
                To exercise any of these rights, please contact us using the
                information provided in Section 8.
              </p>
            </div>
          </Card>

          {/* Section 7 */}
          <Card className="p-6 bg-white border-slate-200" id="whatsapp">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              7. WhatsApp Integration
            </h2>
            <div className="space-y-4 text-slate-700">
              <p className="leading-relaxed">
                Munshi Dada operates as a WhatsApp chatbot. By using our service
                through WhatsApp:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Your WhatsApp phone number is collected and processed</li>
                <li>
                  Messages sent through WhatsApp are transmitted through
                  Meta&apos;s servers and subject to WhatsApp&apos;s privacy
                  policies
                </li>
                <li>
                  WhatsApp may collect metadata about your communication
                  patterns
                </li>
                <li>
                  You remain subject to WhatsApp&apos;s Terms of Service and
                  Privacy Policy
                </li>
                <li>
                  We do not store WhatsApp messages longer than necessary for
                  processing
                </li>
              </ul>
              <p className="leading-relaxed mt-4">
                Please review WhatsApp&apos;s privacy policy at{" "}
                <a
                  href="https://www.whatsapp.com/legal/privacy-policy"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Privacy Policy
                </a>{" "}
                for information about how Meta handles your data.
              </p>
            </div>
          </Card>

          {/* Section 8 */}
          <Card className="p-6 bg-white border-slate-200" id="contact">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              8. Contact Us
            </h2>
            <div className="space-y-4 text-slate-700">
              <p className="leading-relaxed">
                If you have questions about this Privacy Policy or our privacy
                practices, or if you wish to exercise your privacy rights,
                please contact us:
              </p>
              <div className="bg-slate-50 p-4 rounded-lg mt-4 space-y-2">
                <p>
                  <strong>Company:</strong> Munshi Dada
                </p>
                <p>
                  <strong>Email:</strong> shantanugarg2004@gmail.com
                </p>
                <p>
                  <strong>Response Time:</strong> We will respond to your
                  request within 30 days
                </p>
              </div>
            </div>
          </Card>

          {/* Additional Sections */}
          <Card className="p-6 bg-white border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              9. Policy Updates
            </h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy periodically to reflect changes
              in our practices or applicable laws. We will notify you of
              significant changes by updating the &quot;Last Updated&quot; date
              and, if necessary, by sending you an email notification. Your
              continued use of Munshi Dada after such updates constitutes your
              acceptance of the revised Privacy Policy.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              10. Children&apos;s Privacy
            </h2>
            <p className="text-slate-700 leading-relaxed">
              Munshi Dada is intended for use in workplace environments and is
              not intended for children under the age of 13. We do not knowingly
              collect information from children. If we become aware that a child
              under 13 has provided us with personal information, we will take
              steps to delete such information.
            </p>
          </Card>

          {/* Footer */}
          <div className="text-center text-slate-500 text-sm mt-8 pt-8 border-t border-slate-200">
            <p>
              © {new Date().getFullYear()} Munshi Dada. All rights reserved.
            </p>
            <p className="mt-2">
              This Privacy Policy is effective as of the date listed above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
