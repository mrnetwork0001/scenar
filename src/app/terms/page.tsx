import type { Metadata } from "next";
import Link from "next/link";
import { Ext, ISSUES_URL, LegalPage, REPO_URL } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The plain-English terms for using Scenar, including subscriptions, free trials and AI-generated content.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      current="/terms"
      title="Terms of service"
      summary={[
        "Scenar is a practice tool. Its AI counterparts and feedback are generated, can be wrong, and are not professional, legal or career advice.",
        "Pro is a subscription billed through RevenueCat Web Billing, with Stripe processing the payment. It renews automatically until you cancel.",
        "Free trials turn into a paid subscription at the end of the trial unless you cancel before then.",
        "You can cancel at any time from Account & billing; you keep Pro until the end of the period you paid for.",
      ]}
    >
      <h2>Who we are</h2>
      <p>
        Scenar (&ldquo;Scenar&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an independent student
        project, built for RevenueCat Shipaton 2026. The source code is public at{" "}
        <Ext href={REPO_URL}>github.com/mrnetwork0001/scenar</Ext>. The easiest way to reach us is to{" "}
        <Ext href={ISSUES_URL}>open an issue on GitHub</Ext>.
      </p>
      <p>
        By using Scenar you agree to these terms. If you don&apos;t agree, please don&apos;t use the
        app.
      </p>

      <h2>What Scenar does</h2>
      <p>
        Scenar lets you rehearse difficult conversations, such as negotiating a salary or giving hard
        feedback, against AI-played counterparts. While you talk, a tension meter reacts to what you
        say; afterwards you get a scored report. Two scenarios are free without an account. Scenar Pro
        unlocks every scenario, tactical rewrites in the report, voice mode and the custom scenario
        builder.
      </p>
      <p>
        There is no sign-up. Your access is tied to an anonymous RevenueCat ID created in your
        browser. You can move it to another device from{" "}
        <Link href="/account">Account &amp; billing</Link>.
      </p>

      <h2>AI-generated content</h2>
      <p>
        Counterpart replies, scores, coaching notes and reports are produced by AI language models.
        They are meant for practice and reflection only. They may be inaccurate, incomplete, or
        unlike how a real person would react, and they are{" "}
        <strong>not professional, legal, financial, medical, HR or career advice</strong>. Use your
        own judgement before acting on anything Scenar suggests, and seek qualified advice for real
        decisions.
      </p>
      <p>
        Scenarios, characters and names are fictional. Any resemblance to real people is
        coincidental.
      </p>

      <h2>Subscriptions and payment</h2>
      <ul>
        <li>
          <strong>Billing.</strong> Pro plans are sold through RevenueCat Web Billing. Card payments
          are processed by Stripe; we never see or store your full card details.
        </li>
        <li>
          <strong>Prices.</strong> The plans and prices shown in the app are loaded live from
          RevenueCat and are the ones that apply at checkout, including any taxes shown there.
        </li>
        <li>
          <strong>Auto-renewal.</strong> Weekly, monthly and annual plans renew automatically at the end
          of each period, at the then-current price, until you cancel. A lifetime purchase is a
          one-time payment and does not renew.
        </li>
        <li>
          <strong>Free trials.</strong> If a plan includes a free trial, you are not charged during
          the trial. When it ends it converts to a paid subscription automatically unless you cancel
          before the trial ends.
        </li>
        <li>
          <strong>Cancelling.</strong> You can cancel at any time using the &ldquo;Manage or cancel
          subscription&rdquo; link on <Link href="/account">Account &amp; billing</Link>, which opens
          RevenueCat&apos;s customer portal, or the link in your receipt email. Cancelling stops the
          next renewal; you keep Pro until the end of the current period.
        </li>
        <li>
          <strong>Refunds.</strong> See our <Link href="/refunds">refund policy</Link>.
        </li>
        <li>
          <strong>Sandbox mode.</strong> The app can run in a Sandbox environment where purchases are
          test transactions and no money moves. Only the Live environment charges real money, and the
          app asks you to confirm before switching to it.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Please don&apos;t:</p>
      <ul>
        <li>use Scenar to harass, threaten or impersonate real people;</li>
        <li>
          try to make the AI produce illegal, hateful or sexual content involving minors, or use the
          custom builder for that purpose;
        </li>
        <li>
          attack, overload, scrape or reverse-engineer the service, get around its rate limits, or
          unlock Pro features without paying;
        </li>
        <li>resell or redistribute access to Scenar.</li>
      </ul>
      <p>We may limit or block access that breaks these rules.</p>

      <h2>The service is provided as-is</h2>
      <p>
        Scenar is a small independent project. We work to keep it running and accurate, but it is
        provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind. It
        may change, be interrupted, or be discontinued. If we ever discontinue Pro, we will stop
        renewals and handle refunds for unused paid time fairly.
      </p>

      <h2>Limits on liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential losses, or for
        decisions you make based on AI-generated content. Our total liability to you for any claim
        about Scenar is limited to the amount you paid us in the 12 months before the claim. Nothing
        in these terms limits rights you have as a consumer that cannot be excluded by law.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms as the app changes. The date at the top shows the latest version,
        and the full history is public in the GitHub repository. If a change materially affects paid
        subscribers, we will say so in the app before it applies to your next renewal.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? <Ext href={ISSUES_URL}>Open an issue on GitHub</Ext>. Please
        don&apos;t post payment details or other personal information in a public issue.
      </p>
    </LegalPage>
  );
}
