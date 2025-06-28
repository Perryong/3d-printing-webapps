
export interface ContactInfo {
  email: string;
  phone: string;
  linkedin?: string;
  github?: string;
  website?: string;
  location: string;
}

export interface AboutInfo {
  name: string;
  title: string;
  bio: string;
  skills: string[];
  experience: {
    company: string;
    role: string;
    duration: string;
    description: string;
  }[];
  education?: {
    institution: string;
    degree: string;
    year: string;
  }[];
}
