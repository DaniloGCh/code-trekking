// src/app/pages/error/not-found/not-found.page.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  standalone: false,
})
export class NotFoundPage {

  constructor(private router: Router) {}

  volverAlInicio() {
    this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
  }
}
