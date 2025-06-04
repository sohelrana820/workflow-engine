interface ContactInfo {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  jobTitle: string | null;
  location: string | null;
}

interface CompanyInfo {
  name: string | null;
  domain: string | null;
  website: string | null;
  location: string | null;
  employeeCount: number;
  emailPattern: string | null;
}

interface EnrichedContact {
  original_email: string;
  contact: ContactInfo;
  company: CompanyInfo | null;
  enrichment_status: string;
  enriched_at: string;
}
