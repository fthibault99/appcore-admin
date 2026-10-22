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
import { firstValueFrom, timer } from "rxjs";
import { AdminAppStoreService } from "../../core/app-store/admin-app-store.service";
import { AppStoreConnection } from "../../core/app-store/app-store-connection.models";
import {
  AppStoreCatalogApp,
  AppStoreCatalogVersion,
  AppStoreVersionLocalization,
  ReleaseNotesBatch,
  ReleaseNotesBatchSummary,
} from "../../core/app-store/app-store-approval.models";

interface NotesRow {
  locale: string;
  text: string;
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
  readonly selectedBatch = signal<ReleaseNotesBatch | null>(null);
  readonly batches = signal<ReleaseNotesBatchSummary[]>([]);
  readonly batchesError = signal("");
  readonly polling = signal(false);
  private selectionGeneration = 0;
  appId = "";
  version = "";
  subject = "";

  ngOnInit(): void {
    void this.loadApps();
    void this.refreshStatus();
    timer(5000, 5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.refreshStatus();
      });
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
    this.selectedBatch.set(null);
    this.selectionGeneration++;
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
    return !this.busy() && this.selectedBatch()?.state === "PENDING_APPROVAL";
  }

  async preview(): Promise<void> {
    const connection = this.connection();
    if (!connection || !this.canPreview()) return;
    this.busy.set(true);
    this.message.set("");
    const generation = ++this.selectionGeneration;
    try {
      const batch = await firstValueFrom(
        this.service
          .proposeReleaseNotes({
            appId: this.appId,
            version: this.version,
            subject: connection.subject,
            clientId: connection.clientId,
            localizations: Object.fromEntries(
              this.rows().map((row) => [row.locale, row.text]),
            ),
          })
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      if (
        !this.destroyRef.destroyed &&
        generation === this.selectionGeneration
      ) {
        this.selectedBatch.set(batch);
        this.message.set(
          "Proposal saved. Review all languages, then approve once to apply them in the background.",
        );
      }
    } catch (error) {
      if (!this.destroyRef.destroyed) this.message.set(this.errorText(error));
    } finally {
      this.busy.set(false);
    }
    void this.refreshStatus();
  }

  async openBatch(id: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set("");
    const generation = ++this.selectionGeneration;
    try {
      const batch = await firstValueFrom(
        this.service
          .getReleaseNotesBatch(id)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      if (!this.destroyRef.destroyed && generation === this.selectionGeneration)
        this.selectedBatch.set(batch);
    } catch (error) {
      if (!this.destroyRef.destroyed) this.message.set(this.errorText(error));
    } finally {
      this.busy.set(false);
    }
  }

  async approve(): Promise<void> {
    const batch = this.selectedBatch();
    if (!batch || !this.canApprove()) return;
    this.busy.set(true);
    this.message.set("");
    try {
      const queued = await firstValueFrom(
        this.service
          .approveReleaseNotesBatch(batch.id, batch.planHash)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      if (!this.destroyRef.destroyed) {
        this.selectedBatch.set(queued);
        this.message.set(
          "Approved once for all languages. AppCore will apply the notes automatically; you can leave this page.",
        );
      }
    } catch (error) {
      if (!this.destroyRef.destroyed) {
        this.message.set(this.errorText(error));
        // Discard the actionable preview after an approval error; refresh before a new approval.
        this.selectedBatch.set({ ...batch, state: "REVIEW_REQUIRED" });
      }
    } finally {
      this.busy.set(false);
    }
  }

  async refreshBatch(): Promise<void> {
    const batch = this.selectedBatch();
    if (
      !batch ||
      this.busy() ||
      ["QUEUED", "RUNNING", "COMPLETED"].includes(batch.state)
    )
      return;
    this.busy.set(true);
    this.message.set("");
    try {
      const refreshed = await firstValueFrom(
        this.service
          .refreshReleaseNotesBatch(batch.id)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      if (!this.destroyRef.destroyed) this.selectedBatch.set(refreshed);
    } catch (error) {
      if (!this.destroyRef.destroyed) this.message.set(this.errorText(error));
    } finally {
      this.busy.set(false);
    }
  }

  async refreshStatus(): Promise<void> {
    if (this.busy() || this.polling() || this.destroyRef.destroyed) return;
    this.polling.set(true);
    const id = this.selectedBatch()?.id;
    const generation = this.selectionGeneration;
    try {
      const [batches, batch] = await Promise.all([
        firstValueFrom(
          this.service
            .getReleaseNotesBatches()
            .pipe(takeUntilDestroyed(this.destroyRef)),
        ),
        id && ["QUEUED", "RUNNING"].includes(this.selectedBatch()!.state)
          ? firstValueFrom(
              this.service
                .getReleaseNotesBatch(id)
                .pipe(takeUntilDestroyed(this.destroyRef)),
            )
          : Promise.resolve(null),
      ]);
      if (!this.destroyRef.destroyed) {
        this.batches.set(batches);
        this.batchesError.set("");
        if (
          batch &&
          generation === this.selectionGeneration &&
          !this.busy() &&
          this.selectedBatch()?.id === id
        ) {
          this.selectedBatch.set(batch);
          this.batches.update((rows) =>
            rows.map((row) =>
              row.id === batch.id
                ? {
                    ...row,
                    state: batch.state,
                    succeeded: this.completed(batch),
                    updatedAt: batch.updatedAt,
                  }
                : row,
            ),
          );
        }
      }
    } catch (error) {
      if (!this.destroyRef.destroyed)
        this.batchesError.set(this.errorText(error));
    } finally {
      this.polling.set(false);
    }
  }

  isSaved(batch: ReleaseNotesBatch, locale: string): boolean {
    return batch.results.some(row => row.locale === locale && ['SUCCEEDED', 'UNCHANGED'].includes(row.state));
  }

  completed(batch: ReleaseNotesBatch): number {
    return batch.results.filter((row) =>
      ["SUCCEEDED", "UNCHANGED"].includes(row.state),
    ).length;
  }
  resultLabel(batch: ReleaseNotesBatch, locale: string): string {
    const result = batch.results.find((row) => row.locale === locale);
    if (!result) return "Unavailable";
    if (result.state === "APPLYING" && batch.state !== "RUNNING")
      return "Outcome uncertain — refresh before retrying";
    return (
      this.stateLabel(result.state) +
      (result.errorCode ? ` (${result.errorCode})` : "")
    );
  }
  stateLabel(state: string): string {
    const labels: Record<string, string> = {
      PENDING_APPROVAL: "Awaiting approval",
      QUEUED: "Queued",
      RUNNING: "Applying",
      COMPLETED: "Completed",
      PARTIAL_FAILURE: "Some languages need review",
      REVIEW_REQUIRED: "New review required",
      PENDING: "Waiting",
      APPLYING: "Applying",
      SUCCEEDED: "Saved and verified",
      UNCHANGED: "Already up to date",
      UNCERTAIN: "Outcome uncertain",
    };
    return labels[state] ?? state;
  }

  private connection(): AppStoreConnection | undefined {
    return this.connections().find(
      (row) => row.subject === this.subject && row.allowlisted,
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
        return "Apple data changed. Refresh the saved proposal and review it before approving again.";
      if (code === "WRITES_DISABLED")
        return "Apple writes are disabled in AppCore configuration.";
      if (code === "LOCALIZATION_NOT_FOUND")
        return "This language must already exist in App Store Connect.";
      if (typeof error.error?.message === "string") return error.error.message;
    }
    return "Request failed. Generate a new preview before trying again.";
  }
}
