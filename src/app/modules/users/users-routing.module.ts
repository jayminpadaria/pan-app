import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { UserFormComponent } from './components/user-form/user-form.component';
import { UsersComponent } from './pages/users/users.component';

const routes: Routes = [
  { path: '', component: UsersComponent },
  { path: 'create', component: UserFormComponent },
  { path: ':id/change-password', component: ChangePasswordComponent },
  { path: ':id/edit', component: UserFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UsersRoutingModule {}
