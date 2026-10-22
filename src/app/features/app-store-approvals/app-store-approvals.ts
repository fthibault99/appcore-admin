import { DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { AdminAppStoreService } from "../../core/app-store/admin-app-store.service";
import { AppStoreConnection } from "../../core/app-store/app-store-connection.models";
import {
  AppStoreCatalogApp,
  AppStoreCatalogVersion,
  AppStoreVersionLocalization,
  AppStoreApprovalPreview,
  AppStoreNotesRequest,
  AppStoreWriteApproval,
} from "../../core/app-store/app-store-approval.models";

interface NotesRow {
  locale: string;
  text: string;
  request?: AppStoreNotesRequest;
  preview?: AppStoreApprovalPreview;
  approval?: AppStoreWriteApproval;
  error?: string;
}

@Component({
  selector: "app-store-approvals",
  imports: [FormsModule, DatePipe],
  templateUrl: "./app-store-approvals.html",
  styleUrl: "./app-store-approvals.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStoreApprovalsComponent implements OnInit {
  private readonly service = inject(AdminAppStoreService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly connections = input<AppStoreConnection[]>([]);
  readonly rows = signal<NotesRow[]>([{ locale: "", text: "" }]);
  readonly busy = signal(false);
  readonly message = signal("");
  readonly apps = signal<AppStoreCatalogApp[]>([]);
  readonly versions = signal<AppStoreCatalogVersion[]>([]);
  readonly localizations = signal<AppStoreVersionLocalization[]>([]);
  readonly catalogLoading = signal(false);
  readonly catalogError = signal("");
  private catalogGeneration = 0;
  private readonly languageNames = new Intl.DisplayNames(["en"], {
    type: "language",
  });
  appId = "";
  version = "";
  subject = "";

  ngOnInit(): void {
    void this.loadApps();
  }

  async loadApps(): Promise<void> {
    const generation = ++this.catalogGeneration;
    this.appId = "";
    this.version = "";
    this.apps.set([]);
    this.versions.set([]);
    this.localizations.set([]);
    this.rows.set([]);
    this.invalidate();
    this.catalogError.set("");
    this.catalogLoading.set(true);
    try {
      const apps = await firstValueFrom(
        this.service.getConnectApps().pipe(takeUntilDestroyed(this.destroyRef)),
      );
      if (!this.destroyRef.destroyed && generation === this.catalogGeneration)
        this.apps.set(apps);
    } catch (error) {
      if (!this.destroyRef.destroyed && generation === this.catalogGeneration)
        this.catalogError.set(this.errorText(error));
    } finally {
      if (generation === this.catalogGeneration) this.catalogLoading.set(false);
    }
  }

  async selectApp(): Promise<void> {
    const generation = ++this.catalogGeneration;
    this.version = "";
    this.versions.set([]);
    this.localizations.set([]);
    this.rows.set([]);
    this.invalidate();
    this.catalogError.set("");
    if (!this.appId) {
      this.catalogLoading.set(false);
      return;
    }
    this.catalogLoading.set(true);
    try {
      const versions = await firstValueFrom(
        this.service
          .getConnectVersions(this.appId)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      if (!this.destroyRef.destroyed && generation === this.catalogGeneration)
        this.versions.set(versions);
    } catch (error) {
      if (!this.destroyRef.destroyed && generation === this.catalogGeneration)
        this.catalogError.set(this.errorText(error));
    } finally {
      if (generation === this.catalogGeneration) this.catalogLoading.set(false);
    }
  }

  async selectVersion(): Promise<void> {
    const generation = ++this.catalogGeneration;
    this.localizations.set([]);
    this.rows.set([]);
    this.invalidate();
    this.catalogError.set("");
    if (!this.version) {
      this.catalogLoading.set(false);
      return;
    }
    this.catalogLoading.set(true);
    try {
      const localizations = await firstValueFrom(
        this.service
          .getConnectLocalizations(this.appId, this.version)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      if (!this.destroyRef.destroyed && generation === this.catalogGeneration) {
        this.localizations.set(localizations);
        if (localizations.length)
          this.rows.set([{ locale: localizations[0].locale, text: "" }]);
      }
    } catch (error) {
      if (!this.destroyRef.destroyed && generation === this.catalogGeneration)
        this.catalogError.set(this.errorText(error));
    } finally {
      if (generation === this.catalogGeneration) this.catalogLoading.set(false);
    }
  }

  languageLabel(locale: string): string {
    try {
      return this.languageNames.of(locale) ?? locale;
    } catch {
      return locale;
    }
  }

  availableLocales(index: number): AppStoreVersionLocalization[] {
    return this.localizations().filter(
      (locale) =>
        !this.rows().some(
          (row, i) => i !== index && row.locale === locale.locale,
        ),
    );
  }

  addAllLocales(): void {
    if (this.busy() || this.catalogLoading()) return;
    this.invalidate();
    const selected = new Set(this.rows().map((row) => row.locale));
    this.rows.update((rows) => [
      ...rows,
      ...this.localizations()
        .filter((locale) => !selected.has(locale.locale))
        .map((locale) => ({ locale: locale.locale, text: "" })),
    ]);
  }

  versionLabel(version: AppStoreCatalogVersion): string {
    const state: Record<string, string> = {
      PREPARE_FOR_SUBMISSION: "Preparing for submission",
      READY_FOR_SALE: "Released",
      READY_FOR_DISTRIBUTION: "Released",
      IN_REVIEW: "In review",
      WAITING_FOR_REVIEW: "Waiting for review",
      REJECTED: "Rejected",
      DEVELOPER_REJECTED: "Developer rejected",
      METADATA_REJECTED: "Metadata rejected",
    };
    return `${version.version} · ${version.platform === "IOS" ? "iOS" : version.platform} · ${state[version.state] ?? version.state}`;
  }

  invalidate(): void {
    this.rows.update((rows) =>
      rows.map((row) => ({ locale: row.locale, text: row.text })),
    );
    this.message.set("");
  }

  addLocale(): void {
    if (this.busy() || this.catalogLoading()) return;
    const next = this.localizations().find(
      (locale) => !this.rows().some((row) => row.locale === locale.locale),
    );
    if (!next) return;
    this.invalidate();
    this.rows.update((rows) => [...rows, { locale: next.locale, text: "" }]);
  }

  removeLocale(index: number): void {
    if (this.busy()) return;
    this.invalidate();
    this.rows.update((rows) => rows.filter((_, i) => i !== index));
  }

  canPreview(): boolean {
    const rows = this.rows();
    return (
      !this.busy() &&
      !this.catalogLoading() &&
      !!this.connection() &&
      this.apps().some((app) => app.id === this.appId) &&
      this.versions().some((version) => version.id === this.version) &&
      rows.length > 0 &&
      rows.every(
        (row) =>
          this.localizations().some((locale) => locale.locale === row.locale) &&
          !!row.text.trim() &&
          [...row.text].length <= 4000,
      ) &&
      new Set(rows.map((row) => row.locale.trim())).size === rows.length
    );
  }

  canApprove(): boolean {
    return (
      !this.busy() &&
      !this.catalogLoading() &&
      !!this.connection() &&
      this.rows().length > 0 &&
      this.rows().every((row) => !!row.preview && !!row.request) &&
      this.rows().some((row) => !row.approval)
    );
  }

  async preview(): Promise<void> {
    if (!this.canPreview()) return;
    this.invalidate();
    this.busy.set(true);
    try {
      for (let i = 0; i < this.rows().length; i++) {
        const row = this.rows()[i];
        const request: AppStoreNotesRequest = {
          tool: "update_app_metadata",
          arguments: {
            appId: this.appId.trim(),
            version: this.version.trim(),
            locale: row.locale.trim(),
            metadata: { whatsNew: row.text },
          },
        };
        try {
          const preview = await firstValueFrom(
            this.service
              .previewReleaseNotes(request)
              .pipe(takeUntilDestroyed(this.destroyRef)),
          );
          if (this.destroyRef.destroyed) return;
          this.update(i, { request, preview });
        } catch (error) {
          if (this.destroyRef.destroyed) return;
          this.update(i, { error: this.errorText(error) });
        }
      }
    } finally {
      this.busy.set(false);
    }
  }

  async approve(): Promise<void> {
    const connection = this.connection();
    if (!connection || !this.canApprove()) return;
    this.busy.set(true);
    this.message.set("");
    try {
      for (let i = 0; i < this.rows().length; i++) {
        const row = this.rows()[i];
        if (row.approval) continue;
        try {
          const approval = await firstValueFrom(
            this.service
              .approveReleaseNotes({
                ...row.request!,
                subject: connection.subject,
                clientId: connection.clientId,
                expectedPlanHash: row.preview!.planHash,
              })
              .pipe(takeUntilDestroyed(this.destroyRef)),
          );
          if (this.destroyRef.destroyed) return;
          this.update(i, { approval, error: undefined });
        } catch (error) {
          if (this.destroyRef.destroyed) return;
          // A failed approval requires a fresh preview before another attempt.
          this.update(i, {
            preview: undefined,
            request: undefined,
            error: this.errorText(error),
          });
          break;
        }
      }
      const count = this.rows().filter((row) => row.approval).length;
      this.message.set(
        `${count} of ${this.rows().length} approved. Return to the chat to apply the exact reviewed texts before expiry.`,
      );
    } finally {
      this.busy.set(false);
    }
  }

  private connection(): AppStoreConnection | undefined {
    return this.connections().find(
      (row) => row.subject === this.subject && row.allowlisted,
    );
  }

  private update(index: number, patch: Partial<NotesRow>): void {
    this.rows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  private errorText(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        void this.router.navigate(["/login"]);
        return "Sign in again to continue.";
      }
      if (error.status === 403)
        return "Administrator access was refused. Reload your session.";
      if (error.status === 404)
        return "App Store Connect administration is unavailable. Check that the latest backend is deployed.";
      const code = error.error?.code;
      if (code === "PLAN_CHANGED")
        return "Apple data changed. Generate and review a new preview.";
      if (code === "WRITES_DISABLED")
        return "Apple writes are disabled in AppCore configuration.";
      if (code === "LOCALIZATION_NOT_FOUND")
        return "This language must already exist in App Store Connect.";
      if (typeof error.error?.message === "string") return error.error.message;
    }
    return "Request failed. Generate a new preview before trying again.";
  }
}
