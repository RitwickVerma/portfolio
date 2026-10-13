export interface Project {
  slug: string;
  title: string;
  /** One line: what it is. */
  description: string;
  /** What the author did on it. */
  role: string;
  /** One headline number or fact, with its label. */
  metric: { value: string; label: string };
  /** One line on why the engineering is interesting. */
  why: string;
  tech: string[];
  links: {
    github?: string;
    gitlab?: string;
  };
  featured: boolean;
  category: "android" | "quant" | "infra" | "tv" | "games" | "ai" | "embedded" | "linux";
}

export interface Experience {
  company: string;
  role: string;
  location?: string;
  /** Display period, e.g. "Jun — Dec 2020". */
  period: string;
  description: string[];
  tech: string[];
}

export interface Education {
  school: string;
  degree: string;
  period: string;
}

export interface Service {
  name: string;
  description: string;
  ct: string;
  tech: string[];
}
