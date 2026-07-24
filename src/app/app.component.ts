import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'auditorio-frontend';
  isAuthPage = false;

  constructor(private router: Router) {
    this.updateLayout(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateLayout(event.urlAfterRedirects));
  }

  private updateLayout(url: string): void {
    this.isAuthPage = url.startsWith('/auth');
  }
}
