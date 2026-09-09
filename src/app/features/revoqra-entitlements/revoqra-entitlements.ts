import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminRevoqraService } from '../../core/revoqra/admin-revoqra.service';
import { RevoqraEntitlement } from '../../core/revoqra/admin-revoqra.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({selector:'app-revoqra-entitlements', imports:[FormsModule, RouterLink, AdminHeaderComponent], templateUrl:'./revoqra-entitlements.html', styleUrl:'./revoqra-entitlements.scss', changeDetection:ChangeDetectionStrategy.OnPush})
export class RevoqraEntitlementsComponent implements OnInit {
  private readonly service=inject(AdminRevoqraService); private readonly destroyRef=inject(DestroyRef);
  readonly entitlements=signal<RevoqraEntitlement[]>([]); readonly error=signal(false); readonly savingPlan=signal<string|null>(null);
  ngOnInit(){this.service.getEntitlements().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:v=>this.entitlements.set(v),error:()=>this.error.set(true)});}
  updateProfiles(item:RevoqraEntitlement,value:string){item.allowedProfiles=value.split(',').map(v=>v.trim()).filter(v=>v.length>0);}
  save(item:RevoqraEntitlement){this.savingPlan.set(item.plan);this.service.updateEntitlement(item.plan,{monthlyCredits:item.monthlyCredits,maxScheduledResearches:item.maxScheduledResearches,maxUltraRunsPerPeriod:item.maxUltraRunsPerPeriod,apiAccess:item.apiAccess,allowedProfiles:item.allowedProfiles}).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.savingPlan.set(null))).subscribe({next:v=>this.entitlements.update(all=>all.map(e=>e.plan===v.plan?v:e)),error:()=>this.error.set(true)});}
}
