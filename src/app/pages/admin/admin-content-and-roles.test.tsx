import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AdminMarketingPage } from './AdminMarketingPage';
import { AdminAppRoles } from './AdminAppRoles';
import { marketingContentService } from '../../../lib/marketing-content.service';
import { appRoleService } from '../../../lib/app-roles.service';
import { DEFAULT_MARKETING_DOCUMENT } from '../../../lib/marketing-page-document';
const access=vi.hoisted(()=>({admin:true}));
vi.mock('../../context/AuthContext',()=>({useAuth:()=>({user:{id:'admin'},profile:{is_platform_admin:access.admin,platform_console_grants:['settings','users']}})}));
vi.mock('../../../lib/marketing-content.service',()=>({marketingContentService:{loadDraft:vi.fn(),saveDraft:vi.fn(),publish:vi.fn(),loadPublished:vi.fn()}}));
vi.mock('../../../lib/app-roles.service',()=>({appRoleService:{list:vi.fn(),users:vi.fn(),save:vi.fn(),assign:vi.fn(),remove:vi.fn()}}));
vi.mock('../../components/marketing/editorial/useEditorialReveal',()=>({useEditorialReveal:()=>({current:null})}));
const role={id:'role-1',name:'Support desk',description:'App support',grants:['support'] as any,revision:1};
beforeEach(()=>{
  vi.clearAllMocks();access.admin=true;
  vi.mocked(marketingContentService.loadDraft).mockResolvedValue({document:structuredClone(DEFAULT_MARKETING_DOCUMENT),revision:2});
  vi.mocked(marketingContentService.saveDraft).mockImplementation(async(document)=>({document,revision:3}));
  vi.mocked(marketingContentService.publish).mockResolvedValue(undefined);
  vi.mocked(appRoleService.list).mockResolvedValue([role]);
  vi.mocked(appRoleService.users).mockResolvedValue([{id:'user-1',email:'member@example.test',full_name:'Member',platform_role_id:null,is_platform_admin:false}]);
  vi.mocked(appRoleService.save).mockResolvedValue('new-role');vi.mocked(appRoleService.assign).mockResolvedValue(undefined);
});
describe('admin marketing and app role screens',()=>{
  it('denies non-admins and never loads private editor data',()=>{
    access.admin=false;render(<MemoryRouter><AdminMarketingPage/><AdminAppRoles/></MemoryRouter>);
    expect(screen.getByText('Marketing page access restricted')).toBeInTheDocument();
    expect(screen.getByText('App roles access restricted')).toBeInTheDocument();
    expect(marketingContentService.loadDraft).not.toHaveBeenCalled();expect(appRoleService.list).not.toHaveBeenCalled();
  });
  it('saves a private draft, previews it, and publishes only the saved revision after confirmation',async()=>{
    const user=userEvent.setup();render(<MemoryRouter><AdminMarketingPage/></MemoryRouter>);
    const title=await screen.findByLabelText('Headline — first line');
    await user.clear(title);await user.type(title,'A clearer portfolio.');
    expect(screen.getByRole('button',{name:'Publish saved draft'})).toBeDisabled();
    await user.click(screen.getByRole('button',{name:'Preview draft'}));
    expect(screen.getByRole('heading',{name:/A clearer portfolio\./})).toBeInTheDocument();
    expect(marketingContentService.publish).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button',{name:'Save draft'}));
    await waitFor(()=>expect(marketingContentService.saveDraft).toHaveBeenCalledWith(expect.objectContaining({hero:expect.objectContaining({title:'A clearer portfolio.'})}),2));
    await user.click(screen.getByRole('button',{name:'Publish saved draft'}));
    expect(marketingContentService.publish).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button',{name:'Publish now'}));
    await waitFor(()=>expect(marketingContentService.publish).toHaveBeenCalledWith(3));
  });
  it('creates a reusable app role and assigns it without any organization operation',async()=>{
    const user=userEvent.setup();render(<MemoryRouter><AdminAppRoles/></MemoryRouter>);
    await screen.findByRole('heading',{name:'Support desk'});
    await user.type(screen.getByLabelText('Role name'),'Listings reviewer');
    await user.click(screen.getByRole('checkbox',{name:'Listings'}));
    await user.click(screen.getByRole('button',{name:'Create role'}));
    await waitFor(()=>expect(appRoleService.save).toHaveBeenCalledWith(expect.objectContaining({name:'Listings reviewer',grants:['listings'],id:null})));
    await user.selectOptions(screen.getByLabelText('App user'),'user-1');
    await user.selectOptions(screen.getByLabelText('Assign app role'),'role-1');
    await user.click(screen.getByRole('button',{name:'Apply app role'}));
    await waitFor(()=>expect(appRoleService.assign).toHaveBeenCalledWith('user-1','role-1'));
  });
  it('keeps the draft when a save fails and explains the failure',async()=>{
    vi.mocked(marketingContentService.saveDraft).mockRejectedValueOnce(new Error('The draft changed. Reload before saving'));
    const user=userEvent.setup();render(<MemoryRouter><AdminMarketingPage/></MemoryRouter>);
    const title=await screen.findByLabelText('Headline — first line');await user.clear(title);await user.type(title,'Keep my changes');
    await user.click(screen.getByRole('button',{name:'Save draft'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('The draft changed');expect(title).toHaveValue('Keep my changes');
    expect(marketingContentService.publish).not.toHaveBeenCalled();
  });
});
