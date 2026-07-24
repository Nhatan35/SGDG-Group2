import {describe,expect,it} from 'vitest'
import {canAccess,canTransitionAuction,canTransitionHandover,canTransitionPayment,registrationEligible} from './businessRules'
describe('auction transitions',()=>{it('allows live pause and rejects draft live',()=>{expect(canTransitionAuction('LIVE','PAUSED')).toBe(true);expect(canTransitionAuction('DRAFT','LIVE')).toBe(false)})})
describe('registration eligibility',()=>{it('only accepts eligible status',()=>{expect(registrationEligible('ELIGIBLE')).toBe(true);expect(registrationEligible('UNDER_REVIEW')).toBe(false)})})
describe('payment transitions',()=>{it('requires reconciliation before confirmed',()=>{expect(canTransitionPayment('RECONCILING','CONFIRMED')).toBe(true);expect(canTransitionPayment('PENDING','CONFIRMED')).toBe(false)})})
describe('handover transitions',()=>{it('does not complete directly from preparing',()=>{expect(canTransitionHandover('CUSTOMER_CONFIRMED','COMPLETED')).toBe(true);expect(canTransitionHandover('PREPARING','COMPLETED')).toBe(false)})})
describe('route permissions',()=>{it('limits finance and content staff',()=>{expect(canAccess('FINANCE','PAYMENTS')).toBe(true);expect(canAccess('FINANCE','USERS')).toBe(false);expect(canAccess('CONTENT_STAFF','ASSETS')).toBe(true)})})
