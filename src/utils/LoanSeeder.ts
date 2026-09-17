import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

/**
 * LoanSeeder — direct SQLite access to the Library app's shared database,
 * used only to create test preconditions the app's own UI/API cannot
 * produce: a loan whose due_date is in the past, or exactly today.
 *
 * Why this is necessary: the app always computes
 * `due_date = issued_date + 14 days` at issue time
 * (library-management-app-copilot-capstone/src/validators.ts,
 * calculateDueDate), and per
 * docs/KAN-7/requirements-KAN-7.md "Out of Scope" in the app repo, the
 * app deliberately has no persisted "overdue" flag and no endpoint to
 * backdate a loan. A loan created through the UI/API alone can never be
 * overdue on the same day it's created, so the KAN-7 overdue/boundary
 * scenarios seed a normal loan through the UI first (LibraryIssuePage),
 * then use this seeder to directly rewrite that one loan's dates —
 * mirroring what "N days have passed since issue" would look like.
 *
 * Uses Node's built-in `node:sqlite` (DatabaseSync) — the same module the
 * app itself uses (see src/db/database.ts in the app repo) — so no extra
 * DB driver dependency is added to this framework.
 *
 * DB path resolution: LIBRARY_DB_PATH env var (same variable name the app
 * repo itself reads — see src/db/database.ts), defaulting to the sibling
 * app repo checkout's data/library.db. This assumes both repos are cloned
 * side by side locally, e.g.:
 *   .../library-management-app-copilot-capstone/
 *   .../library-management-playwright/
 * If your local layout differs, set LIBRARY_DB_PATH in this repo's .env.
 */
export class LoanSeeder {
  private readonly db: DatabaseSync;
  private readonly seededLoanIds: number[] = [];

  constructor(dbPath: string = LoanSeeder.resolveDbPath()) {
    if (!fs.existsSync(dbPath)) {
      throw new Error(
        `LoanSeeder: library.db not found at "${dbPath}". Set LIBRARY_DB_PATH in .env ` +
          `to point at the running app's database (app repo default: data/library.db).`
      );
    }
    this.db = new DatabaseSync(dbPath);
  }

  private static resolveDbPath(): string {
    return (
      process.env.LIBRARY_DB_PATH ||
      path.resolve(__dirname, '../../../library-management-app-copilot-capstone/data/library.db')
    );
  }

  /**
   * Finds the most recent active (not returned) loan for the given book
   * ISBN + member email, and backdates its issued_date/due_date so it is
   * `daysOverdue` days past due (0 = due exactly today, matching the
   * KAN-7 boundary case). Returns the loan id for reference/cleanup.
   */
  backdateLoan(isbn: string, memberEmail: string, daysOverdue: number): number {
    const loan = this.db
      .prepare(
        `
      SELECT l.id AS id FROM loans l
      JOIN books b ON l.book_id = b.id
      JOIN members m ON l.member_id = m.id
      WHERE b.isbn = ? AND m.email = ? AND l.returned_date IS NULL
      ORDER BY l.id DESC LIMIT 1
    `
      )
      .get(isbn, memberEmail) as { id: number } | undefined;

    if (!loan) {
      throw new Error(`LoanSeeder: no active loan found for ISBN ${isbn} / member ${memberEmail}`);
    }

    const dueDate = LoanSeeder.dateOffset(-daysOverdue);
    const issuedDate = LoanSeeder.dateOffset(-daysOverdue - 14);
    this.db
      .prepare('UPDATE loans SET issued_date = ?, due_date = ? WHERE id = ?')
      .run(issuedDate, dueDate, loan.id);

    this.seededLoanIds.push(loan.id);
    return loan.id;
  }

  /**
   * Marks any currently overdue (unreturned, past-due) loan as returned,
   * so the Overdue Loans view has zero rows — used to reliably reach the
   * empty-state precondition (AC3) regardless of what other tests/seed
   * data already exist in the shared dev database.
   */
  clearAllOverdueLoans(): void {
    this.db
      .prepare(
        `
      UPDATE loans SET returned_date = date('now')
      WHERE returned_date IS NULL AND due_date < date('now')
    `
      )
      .run();
  }

  private static dateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  /**
   * Marks every loan this instance backdated as returned, restoring the
   * shared dev database to a non-overdue state after the test finishes.
   */
  cleanup(): void {
    for (const id of this.seededLoanIds) {
      this.db.prepare("UPDATE loans SET returned_date = date('now') WHERE id = ? AND returned_date IS NULL").run(id);
    }
    this.seededLoanIds.length = 0;
  }

  close(): void {
    this.db.close();
  }
}
