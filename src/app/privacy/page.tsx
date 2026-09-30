import type { Metadata } from "next";
import Link from "next/link";
import { Ext, ISSUES_URL, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Scenar processes, where it is stored, and the choices you have. No ads, no selling data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      current="/privacy"
      title="Privacy"
      summary={[
        "No account, no ads, and we never sell your data.",
        "What you type in a rehearsal is sent to our server and to AI model providers only to generate the reply and report. We don't keep it on our server afterwards.",
        "Your practice history and your anonymous RevenueCat ID live in your own browser's storage.",
        "Payments are handled by RevenueCat and Stripe; we never see your full card details.",
      ]}
    >
      <h2>Who is responsible</h2>
      <p>
        Scenar is an independent student project, built for RevenueCat Shipaton 2026. For any privacy
        question or request, <Ext href={ISSUES_URL}>open an issue on GitHub</Ext> (without including
        personal details in the public issue) and we will follow up.
      </p>

      <h2>What we process, and why</h2>

      <h3>Your rehearsal conversations</h3>
      <p>
        When you play a scenario, the text of the conversation (and, for the custom builder, the
        situation you describe) is sent to our server so an AI model can write the counterpart&apos;s
        next line, score your message, and write your report. Our server forwards it to AI model
        providers through the 0G router. We process it only to produce that response and do{" "}
        <strong>not</strong> store conversations on our server after the request is handled. AI
        providers may keep request data briefly under their own terms, for example for abuse
        monitoring.
      </p>
      <p>
        Please don&apos;t type information you wouldn&apos;t want sent to an AI service, such as real
        names, passwords or health details.
      </p>

      <h3>Voice mode</h3>
      <p>
        Voice mode uses your browser&apos;s built-in speech recognition and speech synthesis. Scenar
        only receives the resulting text. Depending on your browser, the browser vendor may process the
        audio to transcribe it.
      </p>

      <h3>Data stored in your browser</h3>
      <p>Scenar keeps these in your browser&apos;s local storage, on your device:</p>
      <ul>
        <li>your practice history and scores (for the progress panel and streak);</li>
        <li>custom scenarios you build;</li>
        <li>preferences such as &ldquo;read replies aloud&rdquo; and the billing environment;</li>
        <li>
          your anonymous RevenueCat app user ID, which is how your purchase is linked to you without an
          account.
        </li>
      </ul>
      <p>
        We cannot see this data. It stays until you clear it, and it does not follow you to other
        devices unless you copy your ID across on <Link href="/account">Account &amp; billing</Link>.
      </p>

      <h3>Purchases</h3>
      <p>
        Subscriptions are handled by <Ext href="https://www.revenuecat.com/privacy/">RevenueCat</Ext>{" "}
        (subscription management and Web Billing) and{" "}
        <Ext href="https://stripe.com/privacy">Stripe</Ext> (card processing). They receive what they
        need to take a payment, such as your email address and card details, under their own privacy
        policies. From RevenueCat we receive only your subscription status (for example, that the{" "}
        <code>scenar_pro</code> entitlement is active, the product and its expiry date). Our server
        checks this status with RevenueCat before serving Pro-only features, and may receive webhook
        notifications about purchases, renewals and cancellations tied to your anonymous ID.
      </p>

      <h3>Abuse prevention</h3>
      <p>
        To stop the AI endpoints being abused, our server rate-limits requests using your IP address.
        It is held in memory only for the short rate-limit window and is not logged or stored with your
        conversations. Our hosting provider may keep standard server logs.
      </p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No advertising and no ad trackers.</li>
        <li>No selling or renting of your data, ever.</li>
        <li>No accounts, so no profile of you on our side.</li>
        <li>We don&apos;t use your conversations to train AI models.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>Delete your local data</strong> by clearing this site&apos;s data in your browser
          settings. This removes your history, custom scenarios and anonymous ID from the device. Copy
          your app user ID from <Link href="/account">Account &amp; billing</Link> first if you want to
          restore a subscription later.
        </li>
        <li>
          <strong>Purchase data</strong> held by RevenueCat and Stripe: ask us on GitHub and we will
          help you request access or deletion using your app user ID or receipt email.
        </li>
        <li>
          Depending on where you live (for example in the EU or UK), you may have rights to access,
          correct, delete or object to processing of your personal data, and to complain to your data
          protection authority.
        </li>
      </ul>

      <h2>Children</h2>
      <p>Scenar is not directed at children under 13.</p>

      <h2>Changes</h2>
      <p>
        If how we handle data changes, we will update this page and the date at the top. The full
        history is public in the GitHub repository.
      </p>
    </LegalPage>
  );
}
