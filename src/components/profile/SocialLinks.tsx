import { Github, Twitter, Linkedin, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialLinksProps {
  links: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

export function SocialLinks({ links }: SocialLinksProps) {
  const socialItems = [
    {
      key: "github",
      icon: Github,
      url: links.github,
      label: "GitHub",
    },
    {
      key: "twitter",
      icon: Twitter,
      url: links.twitter,
      label: "Twitter",
    },
    {
      key: "linkedin",
      icon: Linkedin,
      url: links.linkedin,
      label: "LinkedIn",
    },
    {
      key: "website",
      icon: Globe,
      url: links.website,
      label: "Website",
    },
  ];

  const activeSocials = socialItems.filter((item) => item.url);

  if (activeSocials.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {activeSocials.map((item) => (
        <Button
          key={item.key}
          variant="outline"
          size="sm"
          className="gap-2"
          asChild
        >
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        </Button>
      ))}
    </div>
  );
}
