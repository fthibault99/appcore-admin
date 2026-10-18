export interface AppStoreCountryRating {
  country: string;
  ratingCount: number;
  averageRating: number | null;
  collectedDate: string;
  collectedAt: string;
}

export interface AppStoreRatings {
  applicationId: string;
  appStoreId: number;
  applicationName: string;
  totalRatings: number;
  averageRating: number | null;
  collectedCountries: number;
  supportedCountries: number;
  oldestCollectedDate: string | null;
  newestCollectedDate: string | null;
  officialAppleWorldwideStatistic: boolean;
  countries: AppStoreCountryRating[];
}

export interface AppStoreRatingsRefreshAccepted {
  runId: string;
  applicationId: string;
  country: string | null;
}

export interface AppStoreRatingsComparison {
  applicationId: string;
  from: string | null;
  to: string | null;
  availableDates: string[];
  countries: {
    country: string;
    before: AppStoreCountryRating | null;
    after: AppStoreCountryRating | null;
    ratingCountChange: number | null;
    averageRatingChange: number | null;
  }[];
}
