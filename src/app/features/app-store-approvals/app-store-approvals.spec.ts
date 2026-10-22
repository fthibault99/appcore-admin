import { HttpErrorResponse } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { AdminAppStoreService } from "../../core/app-store/admin-app-store.service";
import { ReleaseNotesBatch } from "../../core/app-store/app-store-approval.models";
import { AppStoreApprovalsComponent } from "./app-store-approvals";

const connection = {
  subject: "subject",
  clientId: "client",
  applicationIdentityId: "identity",
  createdAt: "",
  allowlisted: true,
};
const batch: ReleaseNotesBatch = {
  id: "batch-id",
  subject: "subject",
  clientId: "client",
  state: "PENDING_APPROVAL",
  planHash: "hash",
  expiresAt: null,
  updatedAt: "2030-01-01T00:00:00Z",
  errorCode: null,
  plan: {
    appId: "123",
    appName: "Brick Collector",
    version: {
      id: "v1",
      version: "1.15.1",
      platform: "IOS",
      state: "PREPARE_FOR_SUBMISSION",
      appVersionState: "",
      releaseType: "MANUAL",
    },
    items: [
      {
        locale: "fr-FR",
        localizationId: "fr",
        before: null,
        after: "Correction.",
        snapshotHash: "old",
      },
      {
        locale: "en-US",
        localizationId: "en",
        before: "Old text",
        after: "Fixed.",
        snapshotHash: "old",
      },
    ],
  },
  results: [
    { locale: "fr-FR", state: "PENDING", errorCode: null },
    { locale: "en-US", state: "PENDING", errorCode: null },
  ],
};

describe("AppStoreApprovalsComponent batch workflow", () => {
  const service = {
    getConnectApps: vi.fn(),
    getConnectVersions: vi.fn(),
    getConnectLocalizations: vi.fn(),
    getReleaseNotesBatches: vi.fn(),
    getReleaseNotesBatch: vi.fn(),
    proposeReleaseNotes: vi.fn(),
    approveReleaseNotesBatch: vi.fn(),
    refreshReleaseNotesBatch: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    service.getConnectApps.mockReturnValue(
      of([
        {
          id: "123",
          name: "Brick Collector",
          bundleId: "com.brick",
          sku: "brick",
        },
      ]),
    );
    service.getConnectVersions.mockReturnValue(of([batch.plan.version]));
    service.getConnectLocalizations.mockReturnValue(
      of([
        { locale: "fr-FR", whatsNew: null },
        { locale: "en-US", whatsNew: null },
      ]),
    );
    service.getReleaseNotesBatches.mockReturnValue(
      of([
        {
          id: batch.id,
          appName: "Brick Collector",
          version: "1.15.1",
          state: "PENDING_APPROVAL",
          total: 2,
          succeeded: 0,
          updatedAt: batch.updatedAt,
        },
      ]),
    );
    service.getReleaseNotesBatch.mockReturnValue(of(batch));
    service.proposeReleaseNotes.mockReturnValue(of(batch));
    service.approveReleaseNotesBatch.mockReturnValue(
      of({ ...batch, state: "QUEUED" }),
    );
    service.refreshReleaseNotesBatch.mockReturnValue(of(batch));
    TestBed.configureTestingModule({
      imports: [AppStoreApprovalsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAppStoreService, useValue: service },
      ],
    });
  });
  async function setup() {
    const fixture = TestBed.createComponent(AppStoreApprovalsComponent);
    fixture.componentRef.setInput("connections", [connection]);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.appId = "123";
    await component.selectApp();
    component.version = "v1";
    await component.selectVersion();
    component.subject = "subject";
    component.rows.set([
      { locale: "fr-FR", text: "Correction." },
      { locale: "en-US", text: "Fixed." },
    ]);
    return { component, fixture };
  }
  it("saves all translations in one persistent proposal and approves once", async () => {
    const { component, fixture } = await setup();
    await component.preview();
    fixture.detectChanges();
    expect(service.proposeReleaseNotes).toHaveBeenCalledExactlyOnceWith({
      appId: "123",
      version: "v1",
      subject: "subject",
      clientId: "client",
      localizations: { "fr-FR": "Correction.", "en-US": "Fixed." },
    });
    expect(fixture.nativeElement.textContent).toContain("Old text");
    expect(fixture.nativeElement.textContent).toContain("Replacement text");
    await component.approve();
    await component.approve();
    expect(service.approveReleaseNotesBatch).toHaveBeenCalledExactlyOnceWith(
      "batch-id",
      "hash",
    );
    expect(component.selectedBatch()?.state).toBe("QUEUED");
  });
  it("loads a plugin proposal after page reload without re-entering any text", async () => {
    const { component, fixture } = await setup();
    component.rows.set([]);
    component.subject = "";
    await component.openBatch("batch-id");
    fixture.detectChanges();
    expect(component.canApprove()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain("Correction.");
    expect(fixture.nativeElement.textContent).toContain("Fixed.");
    expect(service.proposeReleaseNotes).not.toHaveBeenCalled();
  });
  it("invalidates the selected manual proposal after editing the composer", async () => {
    const { component, fixture } = await setup();
    await component.preview();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
    textarea.value = "Changed";
    textarea.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    expect(component.selectedBatch()).toBeNull();
    expect(component.canApprove()).toBe(false);
    expect(component.batches()).toHaveLength(1);
  });
  it("shows durable progress and per-language results without resubmitting writes", async () => {
    const { component } = await setup();
    await component.openBatch(batch.id);
    await component.approve();
    const completed = {
      ...batch,
      state: "COMPLETED",
      results: batch.results.map((row) => ({ ...row, state: "SUCCEEDED" })),
    };
    service.getReleaseNotesBatch.mockReturnValue(of(completed));
    await component.refreshStatus();
    expect(component.selectedBatch()?.state).toBe("COMPLETED");
    expect(component.batches()[0].state).toBe("COMPLETED");
    expect(component.batches()[0].succeeded).toBe(2);
    expect(component.completed(component.selectedBatch()!)).toBe(2);
    expect(service.approveReleaseNotesBatch).toHaveBeenCalledTimes(1);
  });
  it("requires refreshing a changed plan before allowing another approval", async () => {
    const { component } = await setup();
    await component.openBatch(batch.id);
    service.approveReleaseNotesBatch.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { code: "PLAN_CHANGED" },
          }),
      ),
    );
    await component.approve();
    expect(component.canApprove()).toBe(false);
    expect(component.message()).toContain("Apple data changed");
    await component.refreshBatch();
    expect(service.refreshReleaseNotesBatch).toHaveBeenCalledExactlyOnceWith(
      batch.id,
    );
    expect(component.canApprove()).toBe(true);
  });
  it("does not automatically retry partial or uncertain writes", async () => {
    const { component } = await setup();
    component.selectedBatch.set({
      ...batch,
      state: "PARTIAL_FAILURE",
      results: [
        { locale: "fr-FR", state: "SUCCEEDED", errorCode: null },
        { locale: "en-US", state: "UNCERTAIN", errorCode: "TIMEOUT" },
      ],
    });
    await component.refreshStatus();
    await component.approve();
    expect(service.approveReleaseNotesBatch).not.toHaveBeenCalled();
    expect(service.refreshReleaseNotesBatch).not.toHaveBeenCalled();
    expect(component.completed(component.selectedBatch()!)).toBe(1);
  });
  it("rejects duplicate languages and unauthorized manual proposals", async () => {
    const { component, fixture } = await setup();
    component.rows.set([
      { locale: "fr-FR", text: "A" },
      { locale: "fr-FR", text: "B" },
    ]);
    expect(component.canPreview()).toBe(false);
    component.rows.set([{ locale: "fr-FR", text: "A" }]);
    fixture.componentRef.setInput("connections", [
      { ...connection, allowlisted: false },
    ]);
    await component.preview();
    expect(service.proposeReleaseNotes).not.toHaveBeenCalled();
  });
  it("ignores stale version responses and clears the selected proposal when changing apps", async () => {
    const { component } = await setup();
    await component.openBatch(batch.id);
    const pending = new Subject<never[]>();
    service.getConnectVersions
      .mockReturnValueOnce(pending)
      .mockReturnValueOnce(of([{ ...batch.plan.version, id: "new" }]));
    component.appId = "old";
    const first = component.selectApp();
    component.appId = "new";
    await component.selectApp();
    pending.next([]);
    pending.complete();
    await first;
    expect(component.versions()[0].id).toBe("new");
    expect(component.selectedBatch()).toBeNull();
    expect(component.rows()).toEqual([]);
  });
  it("keeps polling failures separate from an empty request list", async () => {
    const { component } = await setup();
    service.getReleaseNotesBatches.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    await component.refreshStatus();
    expect(component.batchesError()).toBeTruthy();
    expect(component.batches()).toHaveLength(1);
  });
});
