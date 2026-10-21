import { HttpErrorResponse } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { AdminAppStoreService } from "../../core/app-store/admin-app-store.service";
import { AppStoreApprovalsComponent } from "./app-store-approvals";

const connection = {
  subject: "subject",
  clientId: "client",
  applicationIdentityId: "identity",
  createdAt: "",
  allowlisted: true,
};
const preview = {
  planHash: "hash",
  plan: {
    appId: "6503181781",
    versionId: "version-id",
    platform: "IOS",
    state: "PREPARE_FOR_SUBMISSION",
    snapshot: {
      current: {
        name: "Brick Collector",
        version: "1.15.1",
        locale: "fr-FR",
        whatsNew: "Old text",
      },
    },
    commands: [],
  },
};

describe("AppStoreApprovalsComponent", () => {
  const service = {
    previewReleaseNotes: vi.fn(),
    approveReleaseNotes: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    service.previewReleaseNotes.mockReturnValue(of(preview));
    service.approveReleaseNotes.mockReturnValue(
      of({
        id: "approval",
        planHash: "hash",
        expiresAt: "2030-01-01T00:10:00Z",
      }),
    );
    TestBed.configureTestingModule({
      imports: [AppStoreApprovalsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAppStoreService, useValue: service },
      ],
    });
  });
  function setup() {
    const fixture = TestBed.createComponent(AppStoreApprovalsComponent);
    fixture.componentRef.setInput("connections", [connection]);
    const component = fixture.componentInstance;
    component.appId = "6503181781";
    component.version = "1.15.1";
    component.subject = "subject";
    component.rows.set([{ locale: "fr-FR", text: "New text" }]);
    fixture.detectChanges();
    return { fixture, component };
  }
  it("requires a preview and uses its exact text, hash and selected identity", async () => {
    const { component, fixture } = setup();
    await component.approve();
    expect(service.approveReleaseNotes).not.toHaveBeenCalled();
    await component.preview();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Old text");
    expect(fixture.nativeElement.textContent).toContain("New text");
    await component.approve();
    expect(service.approveReleaseNotes).toHaveBeenCalledExactlyOnceWith({
      tool: "update_app_metadata",
      arguments: {
        appId: "6503181781",
        version: "1.15.1",
        locale: "fr-FR",
        metadata: { whatsNew: "New text" },
      },
      subject: "subject",
      clientId: "client",
      expectedPlanHash: "hash",
    });
    await component.approve();
    expect(service.approveReleaseNotes).toHaveBeenCalledTimes(1);
  });
  it("invalidates the reviewed plan when a form input changes", async () => {
    const { component, fixture } = setup();
    await component.preview();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
    input.value = "Changed text";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    expect(component.canApprove()).toBe(false);
    expect(component.rows()[0].preview).toBeUndefined();
    await component.approve();
    expect(service.approveReleaseNotes).not.toHaveBeenCalled();
  });
  it("rejects unauthorized connections and duplicate languages", () => {
    const { component, fixture } = setup();
    component.rows.set([
      { locale: "fr-FR", text: "A" },
      { locale: "fr-FR", text: "B" },
    ]);
    expect(component.canPreview()).toBe(false);
    component.rows.set([{ locale: "fr-FR", text: "A" }]);
    fixture.componentRef.setInput("connections", [
      { ...connection, allowlisted: false },
    ]);
    expect(component.canPreview()).toBe(false);
  });
  it("prevents approval when any localization preview fails", async () => {
    const { component } = setup();
    component.rows.set([
      { locale: "fr-FR", text: "A" },
      { locale: "missing", text: "B" },
    ]);
    service.previewReleaseNotes
      .mockReturnValueOnce(of(preview))
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { code: "LOCALIZATION_NOT_FOUND" },
            }),
        ),
      );
    await component.preview();
    expect(component.canApprove()).toBe(false);
    expect(component.rows()[1].error).toContain("already exist");
  });
  it("preserves partial approvals and requires a new preview after Apple state changes", async () => {
    const { component } = setup();
    component.rows.set([
      { locale: "fr-FR", text: "A" },
      { locale: "en-US", text: "B" },
    ]);
    await component.preview();
    service.approveReleaseNotes
      .mockReturnValueOnce(
        of({
          id: "approval",
          planHash: "hash",
          expiresAt: "2030-01-01T00:10:00Z",
        }),
      )
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { code: "PLAN_CHANGED" },
            }),
        ),
      );
    await component.approve();
    expect(component.rows()[0].approval?.id).toBe("approval");
    expect(component.rows()[1].error).toContain("Apple data changed");
    expect(component.canApprove()).toBe(false);
    expect(component.message()).toContain("1 of 2 approved");
  });
  it("blocks concurrent requests while the preview is loading", async () => {
    const { component } = setup();
    const pending = new Subject<typeof preview>();
    service.previewReleaseNotes.mockReturnValue(pending);
    const request = component.preview();
    expect(component.busy()).toBe(true);
    await component.preview();
    await component.approve();
    expect(service.previewReleaseNotes).toHaveBeenCalledTimes(1);
    expect(service.approveReleaseNotes).not.toHaveBeenCalled();
    pending.next(preview);
    pending.complete();
    await request;
    expect(component.busy()).toBe(false);
  });
});
