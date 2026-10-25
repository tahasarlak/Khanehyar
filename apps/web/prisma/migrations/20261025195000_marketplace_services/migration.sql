CREATE TYPE "DevelopmentProjectType" AS ENUM ('PRE_SALE', 'UNDER_CONSTRUCTION', 'PARTICIPATION');
CREATE TYPE "DevelopmentProjectStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'REJECTED');
CREATE TYPE "StayPropertyType" AS ENUM ('HOTEL', 'MOTEL', 'INN', 'GUESTHOUSE', 'APARTMENT_HOTEL', 'VILLA', 'ECOTOURISM_LODGE');
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'HOLD', 'RELEASE', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "PaidFeatureStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

CREATE TABLE "DevelopmentProject" (
 "id" TEXT NOT NULL, "title" VARCHAR(160) NOT NULL, "slug" VARCHAR(180) NOT NULL, "description" TEXT NOT NULL,
 "projectType" "DevelopmentProjectType" NOT NULL, "status" "DevelopmentProjectStatus" NOT NULL DEFAULT 'PENDING',
 "city" VARCHAR(100) NOT NULL, "address" VARCHAR(300), "developerName" VARCHAR(160) NOT NULL,
 "expectedCompletion" TIMESTAMP(3), "totalUnits" INTEGER, "availableUnits" INTEGER,
 "minimumInvestment" DECIMAL(16,2), "priceFrom" DECIMAL(16,2), "currency" VARCHAR(3) NOT NULL DEFAULT 'IRR',
 "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "publishedAt" TIMESTAMP(3),
 "ownerId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "DevelopmentProject_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "DevelopmentProject_slug_key" ON "DevelopmentProject"("slug");
CREATE INDEX "DevelopmentProject_status_projectType_city_idx" ON "DevelopmentProject"("status", "projectType", "city");
CREATE INDEX "DevelopmentProject_ownerId_createdAt_idx" ON "DevelopmentProject"("ownerId", "createdAt");
ALTER TABLE "DevelopmentProject" ADD CONSTRAINT "DevelopmentProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProjectInterest" (
 "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "userId" TEXT NOT NULL, "message" VARCHAR(1200), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ProjectInterest_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ProjectInterest_projectId_userId_key" ON "ProjectInterest"("projectId", "userId");
CREATE INDEX "ProjectInterest_userId_createdAt_idx" ON "ProjectInterest"("userId", "createdAt");
ALTER TABLE "ProjectInterest" ADD CONSTRAINT "ProjectInterest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DevelopmentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectInterest" ADD CONSTRAINT "ProjectInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StayListing" (
 "id" TEXT NOT NULL, "title" VARCHAR(160) NOT NULL, "slug" VARCHAR(180) NOT NULL, "description" TEXT NOT NULL,
 "stayType" "StayPropertyType" NOT NULL, "city" VARCHAR(100) NOT NULL, "address" VARCHAR(300),
 "nightlyRate" DECIMAL(14,2), "weeklyRate" DECIMAL(14,2), "hourlyRate" DECIMAL(14,2), "monthlyRate" DECIMAL(14,2),
 "currency" VARCHAR(3) NOT NULL DEFAULT 'IRR', "roomCount" INTEGER, "maxGuests" INTEGER,
 "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "status" "ListingStatus" NOT NULL DEFAULT 'PENDING', "ownerId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StayListing_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "StayListing_slug_key" ON "StayListing"("slug");
CREATE INDEX "StayListing_status_stayType_city_idx" ON "StayListing"("status", "stayType", "city");
CREATE INDEX "StayListing_ownerId_createdAt_idx" ON "StayListing"("ownerId", "createdAt");
ALTER TABLE "StayListing" ADD CONSTRAINT "StayListing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AgentProfile" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "slug" VARCHAR(180) NOT NULL, "displayName" VARCHAR(140) NOT NULL,
 "bio" VARCHAR(3000), "publicPhone" VARCHAR(30), "city" VARCHAR(100) NOT NULL, "licenseNumber" VARCHAR(100), "verifiedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AgentProfile_userId_key" ON "AgentProfile"("userId");
CREATE UNIQUE INDEX "AgentProfile_slug_key" ON "AgentProfile"("slug");
CREATE INDEX "AgentProfile_city_verifiedAt_idx" ON "AgentProfile"("city", "verifiedAt");
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AgencyProfile" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "slug" VARCHAR(180) NOT NULL, "name" VARCHAR(160) NOT NULL,
 "description" VARCHAR(3000), "city" VARCHAR(100) NOT NULL, "address" VARCHAR(300), "publicPhone" VARCHAR(30), "website" VARCHAR(2048),
 "licenseNumber" VARCHAR(100), "verifiedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AgencyProfile_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AgencyProfile_userId_key" ON "AgencyProfile"("userId");
CREATE UNIQUE INDEX "AgencyProfile_slug_key" ON "AgencyProfile"("slug");
CREATE INDEX "AgencyProfile_city_verifiedAt_idx" ON "AgencyProfile"("city", "verifiedAt");
ALTER TABLE "AgencyProfile" ADD CONSTRAINT "AgencyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AgentAgencyMember" (
 "id" TEXT NOT NULL, "agentProfileId" TEXT NOT NULL, "agencyProfileId" TEXT NOT NULL, "title" VARCHAR(100), "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AgentAgencyMember_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AgentAgencyMember_agentProfileId_agencyProfileId_key" ON "AgentAgencyMember"("agentProfileId", "agencyProfileId");
CREATE INDEX "AgentAgencyMember_agencyProfileId_status_idx" ON "AgentAgencyMember"("agencyProfileId", "status");
ALTER TABLE "AgentAgencyMember" ADD CONSTRAINT "AgentAgencyMember_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentAgencyMember" ADD CONSTRAINT "AgentAgencyMember_agencyProfileId_fkey" FOREIGN KEY ("agencyProfileId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ListingAgentAssignment" (
 "id" TEXT NOT NULL, "listingId" TEXT NOT NULL, "agentProfileId" TEXT NOT NULL, "agencyProfileId" TEXT, "ownerId" TEXT NOT NULL,
 "commissionType" VARCHAR(20) NOT NULL DEFAULT 'PERCENT', "commissionValue" DECIMAL(12,2) NOT NULL, "commissionNote" VARCHAR(1000),
 "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ListingAgentAssignment_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ListingAgentAssignment_listingId_key" ON "ListingAgentAssignment"("listingId");
CREATE INDEX "ListingAgentAssignment_agentProfileId_status_idx" ON "ListingAgentAssignment"("agentProfileId", "status");
CREATE INDEX "ListingAgentAssignment_agencyProfileId_status_idx" ON "ListingAgentAssignment"("agencyProfileId", "status");
ALTER TABLE "ListingAgentAssignment" ADD CONSTRAINT "ListingAgentAssignment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingAgentAssignment" ADD CONSTRAINT "ListingAgentAssignment_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ListingAgentAssignment" ADD CONSTRAINT "ListingAgentAssignment_agencyProfileId_fkey" FOREIGN KEY ("agencyProfileId") REFERENCES "AgencyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListingAgentAssignment" ADD CONSTRAINT "ListingAgentAssignment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Wallet" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "balance" DECIMAL(16,2) NOT NULL DEFAULT 0, "currency" VARCHAR(3) NOT NULL DEFAULT 'IRR',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WalletTransaction" (
 "id" TEXT NOT NULL, "walletId" TEXT NOT NULL, "type" "WalletTransactionType" NOT NULL, "amount" DECIMAL(16,2) NOT NULL,
 "currency" VARCHAR(3) NOT NULL DEFAULT 'IRR', "description" VARCHAR(500) NOT NULL, "reference" VARCHAR(180), "metadata" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "WalletTransaction_reference_key" ON "WalletTransaction"("reference");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX "WalletTransaction_type_createdAt_idx" ON "WalletTransaction"("type", "createdAt");
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "KycVerification" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "status" "KycStatus" NOT NULL DEFAULT 'PENDING', "fullName" VARCHAR(160) NOT NULL,
 "nationalIdLast4" VARCHAR(4), "phone" VARCHAR(30), "note" VARCHAR(1000), "rejectionReason" VARCHAR(1000), "reviewMethod" VARCHAR(80),
 "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewedAt" TIMESTAMP(3), "reviewedById" TEXT,
 CONSTRAINT "KycVerification_pkey" PRIMARY KEY ("id"));
CREATE INDEX "KycVerification_userId_submittedAt_idx" ON "KycVerification"("userId", "submittedAt");
CREATE INDEX "KycVerification_status_submittedAt_idx" ON "KycVerification"("status", "submittedAt");
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PaidFeaturePurchase" (
 "id" TEXT NOT NULL, "walletId" TEXT NOT NULL, "featureCode" VARCHAR(80) NOT NULL, "description" VARCHAR(300) NOT NULL,
 "amount" DECIMAL(16,2) NOT NULL, "currency" VARCHAR(3) NOT NULL DEFAULT 'IRR', "status" "PaidFeatureStatus" NOT NULL DEFAULT 'PENDING',
 "listingId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PaidFeaturePurchase_pkey" PRIMARY KEY ("id"));
CREATE INDEX "PaidFeaturePurchase_walletId_createdAt_idx" ON "PaidFeaturePurchase"("walletId", "createdAt");
CREATE INDEX "PaidFeaturePurchase_status_createdAt_idx" ON "PaidFeaturePurchase"("status", "createdAt");
ALTER TABLE "PaidFeaturePurchase" ADD CONSTRAINT "PaidFeaturePurchase_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
