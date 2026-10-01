export interface Project {
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  tech: string[];
  links: {
    github?: string;
    gitlab?: string;
    live?: string;
    playstore?: string;
  };
  image?: string;
  featured: boolean;
  category: "android" | "systems" | "web" | "ai" | "embedded" | "infra";
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  description: string[];
  tech: string[];
}

export interface Service {
  name: string;
  description: string;
  ct: string;
  ip: string;
  domain?: string;
  port?: number;
  tech: string[];
}
