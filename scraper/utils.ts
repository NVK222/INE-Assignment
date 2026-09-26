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
    }
    catch (e) {
        throw new Error(errorMsg, { cause: e })
    }
}

export function fixPrice(text: string) {
    const normalized = text
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, "")

    const match = normalized.match(/(?:₹|Rs\.?)([\d,]+(?:\.\d+)?)/i)

    if (!match) {
        throw new Error(`Could not extract price from: ${text}`)
    }

    return match[1]
}
