import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const LAST_UPDATED = 'March 5, 2026';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using Study Campus ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Platform. Your continued use of the Platform constitutes acceptance of any updates or modifications to these terms.`,
  },
  {
    id: 'accounts',
    title: '2. User Accounts & Eligibility',
    content: `You must be a currently enrolled student or authorized faculty member to create an account. Registration requires a valid invite code provided by your class administrator. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information during registration.`,
  },
  {
    id: 'acceptable-use',
    title: '3. Acceptable Use Policy',
    content: `You agree to use the Platform only for lawful educational purposes. You shall not: (a) upload malicious content, spam, or harmful material; (b) harass, bully, or intimidate other users; (c) impersonate another person or misrepresent your affiliation; (d) attempt to gain unauthorized access to the Platform or its systems; (e) use automated bots or scripts to interact with the Platform; (f) share your account credentials with others.`,
  },
  {
    id: 'intellectual-property',
    title: '4. Intellectual Property',
    content: `All notes, MCQ tests, and educational content provided by administrators remain the intellectual property of their respective creators or the institution. You may not reproduce, distribute, or commercially exploit any content from the Platform without prior written consent. The Platform's design, logos, and branding are protected by applicable intellectual property laws.`,
  },
  {
    id: 'user-content',
    title: '5. User-Generated Content',
    content: `By posting questions, answers, comments, or other content on the Platform, you grant Study Campus a non-exclusive, royalty-free license to display and distribute such content within the Platform. You retain ownership of your original content. You are solely responsible for the content you post and must ensure it does not violate any third-party rights, applicable laws, or these Terms. We reserve the right to remove any content that violates these terms without prior notice.`,
  },
  {
    id: 'privacy',
    title: '6. Privacy & Data Collection',
    content: `We collect and process personal data necessary to provide Platform services, including your name, email address, and usage analytics. Your data is stored securely and will not be sold to third parties. We may use anonymized, aggregated data for improving the Platform experience. By using the Platform, you consent to the collection and processing of your data as described herein. You may request deletion of your account and associated data by contacting the administrator.`,
  },
  {
    id: 'liability',
    title: '7. Limitation of Liability',
    content: `The Platform is provided "as is" without warranties of any kind, either express or implied. Study Campus shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the Platform. We do not guarantee the accuracy, completeness, or reliability of any content on the Platform, including user-generated content and educational materials. Your use of the Platform is at your own risk.`,
  },
  {
    id: 'termination',
    title: '8. Termination',
    content: `We reserve the right to suspend or terminate your account at any time, with or without cause, including but not limited to violation of these Terms. Upon termination, your right to access the Platform ceases immediately. Any content you have posted may remain on the Platform at our discretion. You may request account deletion by contacting your class administrator.`,
  },
  {
    id: 'changes',
    title: '9. Changes to Terms',
    content: `We reserve the right to modify these Terms at any time. Material changes will be communicated through the Platform via announcements. Your continued use of the Platform after such modifications constitutes acceptance of the updated Terms. We encourage you to review these Terms periodically.`,
  },
  {
    id: 'contact',
    title: '10. Contact Information',
    content: `If you have any questions, concerns, or feedback regarding these Terms and Conditions, please contact your class administrator or reach out through the Requests section on the Platform. We aim to respond to all inquiries within a reasonable timeframe.`,
  },
];

export default function Terms() {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg">Terms & Conditions</h1>
            <p className="text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>
      </header>

      <div className="container max-w-5xl mx-auto px-4 py-6 md:py-10">
        <div className="flex gap-8">
          {/* Desktop sidebar TOC */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contents</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={cn(
                      'block w-full text-left text-sm px-3 py-2 rounded-lg transition-colors',
                      activeSection === s.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Intro */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 md:p-8 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Study Campus Terms & Conditions</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Welcome to Study Campus. These terms govern your use of our educational platform. 
                Please read them carefully before creating an account or using any features.
              </p>
            </div>

            {/* Mobile: Accordion | Desktop: Section cards */}
            <div className="lg:hidden">
              <Accordion type="single" collapsible className="space-y-2">
                {sections.map((s) => (
                  <AccordionItem key={s.id} value={s.id} className="border rounded-2xl px-4 data-[state=open]:bg-card">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline">{s.title}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {s.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div className="hidden lg:block space-y-4">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="rounded-2xl border border-border/50 bg-card p-6 scroll-mt-24"
                >
                  <h3 className="text-lg font-semibold mb-3">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
                </section>
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* Back to top (mobile) */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-40 p-3 rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
