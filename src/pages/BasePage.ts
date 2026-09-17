import { Locator, Page } from "@playwright/test";
import fs from 'fs';

export default class BasePage {
    constructor(protected readonly page:Page) {}

    async navigate(path: string = '/'): Promise<void> {
        await this.page.goto(path, {waitUntil: 'domcontentloaded'});   }



    async screenshot(name: string): Promise<Buffer> {
        const dir = 'reports/screenhsots';
        fs.mkdirSync(dir, {recursive:true});
        return this.page.screenshot({path: `${dir}/${name}.png`, fullPage:true})
    }

    async waitForELement(locator : Locator, timeout?: number) : Promise<void> {
        await locator.waitFor({state: 'visible', timeout})
    }

    async fill(locator: Locator, value: string): Promise<void> {
        await locator.fill(value);
    }

    async click(locator: Locator): Promise<void> {
        await locator.click();
    }

    async dismissOverlaysIfPresent(): Promise<void> {
        const adCloseButton = this.page.locator('#dismiss-button');
        const isPresent = await adCloseButton
            .isVisible({ timeout: 2000 })
            .catch(() => false);

        if (isPresent) {
            await adCloseButton.click().catch(() => { });
            return;
        }
    }
}