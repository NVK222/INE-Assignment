export async function retryUntil(action: () => Promise<void>, condition: () => Promise<void>, maxRetries: number, errorMsg: string) {
    /*
    Simple helper function to retry small actions if they fail.
    */
    for (let i = 0; i < maxRetries; i++) {
        await action()
        try {
            await condition()
            return
        }
        catch {
            if (i == maxRetries - 1) throw Error(errorMsg)
        }
    }
}

export async function validate(condition: () => Promise<void>, errorMsg: string) {
    try {
        await condition()
        return true
    }
    catch {
        console.error(errorMsg)
        return false
    }
}

export function fixPrice(price: string) {
    return price.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, "")
}
