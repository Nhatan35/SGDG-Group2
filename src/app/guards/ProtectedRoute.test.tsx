import {render,screen} from '@testing-library/react'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {beforeEach,describe,expect,it} from 'vitest'
import {CustomerGuard} from './ProtectedRoute'
import {useDemoStore} from '../../store/demoStore'
describe('CustomerGuard',()=>{beforeEach(()=>useDemoStore.setState({authenticated:false}));it('redirects guests to login',()=>{render(<MemoryRouter initialEntries={['/account']}><Routes><Route path="/account" element={<CustomerGuard><div>Private</div></CustomerGuard>}/><Route path="/auth/login" element={<div>Login required</div>}/></Routes></MemoryRouter>);expect(screen.getByText('Login required')).toBeInTheDocument()});it('renders authenticated content',()=>{useDemoStore.setState({authenticated:true});render(<MemoryRouter initialEntries={['/account']}><CustomerGuard><div>Private</div></CustomerGuard></MemoryRouter>);expect(screen.getByText('Private')).toBeInTheDocument()})})
