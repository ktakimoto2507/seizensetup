// src/types/share.ts
export type ShareResource =
  | "assets"
  | "beneficiaries"
  | "profile"
  | "documents"
  | "contacts"
  | "messages";

export type ShareScope = "read" | "write" | "manage";

export type FamilyMember = {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  relation: string | null;
  status: "invited" | "active" | "revoked";
  created_at: string;
  updated_at: string;
};

export type LegacyMessage = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  visibility: "private" | "shared";
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  owner_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};
