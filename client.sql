generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ------------------------------------------------------
// 1. TENANT & USER MANAGEMENT (Synced via Clerk Webhooks)
// ------------------------------------------------------

model Organization {
  id        String   @id // Maps exactly to Clerk's Organization ID
  name      String
  createdAt DateTime @default(now())
  
  // An MSP user might belong to multiple organizations
  users     OrganizationUser[]
  
  // All core app data rolls up to the Organization
  vendors   Vendor[]
}

model User {
  id        String   @id // Maps exactly to Clerk's User ID
  email     String   @unique
  name      String?
  
  organizations OrganizationUser[]
}

model OrganizationUser {
  userId         String
  organizationId String
  role           String   // e.g., 'msp_admin', 'practice_manager'
  
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@id([userId, organizationId])
}

// ------------------------------------------------------
// 2. CORE BUSINESS LOGIC (Vendor & BAA Tracking)
// ------------------------------------------------------

model Vendor {
  id             String       @id @default(uuid())
  organizationId String
  name           String
  contactName    String
  contactEmail   String
  status         VendorStatus @default(PENDING)
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  baaRecords     BaaRecord[]
  requests       VerificationRequest[]

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId]) // Crucial for multi-tenant query performance
}

model BaaRecord {
  id             String    @id @default(uuid())
  vendorId       String
  fileUrl        String?   // Pointer to the Supabase Storage bucket path
  signedDate     DateTime?
  expirationDate DateTime? // Used to trigger next year's automated emails
  isVerified     Boolean   @default(false)
  
  vendor         Vendor    @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

// ------------------------------------------------------
// 3. AUTOMATION LOGIC (Digital Mailroom / Requests)
// ------------------------------------------------------

model VerificationRequest {
  id          String        @id @default(uuid())
  vendorId    String
  token       String        @unique // Secure, unguessable magic link for the vendor
  status      RequestStatus @default(SENT)
  
  sentAt      DateTime      @default(now())
  completedAt DateTime?
  
  vendor      Vendor        @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  
  @@index([token]) // Fast lookups when vendors click their email link
}

// ------------------------------------------------------
// ENUMS
// ------------------------------------------------------

enum VendorStatus {
  COMPLIANT
  PENDING
  OVERDUE
  AT_RISK
}

enum RequestStatus {
  SENT
  OPENED
  COMPLETED
  EXPIRED
}
