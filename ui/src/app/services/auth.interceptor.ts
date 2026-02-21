import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError, switchMap, catchError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from './auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Don't attach token to refresh/login calls to avoid loops
  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const token = auth.token();
  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && token) {
        return handleRefresh(auth, req, next);
      }
      return throwError(() => err);
    })
  );
};

const handleRefresh: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    return auth.refresh().pipe(
      switchMap((res) => {
        isRefreshing = false;
        refreshSubject.next(res.accessToken);
        const retried = req.clone({
          setHeaders: { Authorization: `Bearer ${res.accessToken}` }
        });
        return next(retried);
      }),
      catchError((refreshErr) => {
        isRefreshing = false;
        auth.logout();
        return throwError(() => refreshErr);
      })
    );
  }

  // Another call is already refreshing — wait for the new token
  return refreshSubject.pipe(
    filter((t) => t !== null),
    take(1),
    switchMap((newToken) => {
      const retried = req.clone({
        setHeaders: { Authorization: `Bearer ${newToken}` }
      });
      return next(retried);
    })
  );
};
