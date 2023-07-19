const CODE_A_UPPER = 'A'.charCodeAt(0)
const CODE_Z_UPPER = 'Z'.charCodeAt(0)
const CODE_A_LOWER = 'a'.charCodeAt(0)
const CODE_Z_LOWER = 'z'.charCodeAt(0)
const CODE_0 = '0'.charCodeAt(0)
const CODE_9 = '9'.charCodeAt(0)
const CODE_PLUS = '+'.charCodeAt(0)
const CODE_SLASH = '/'.charCodeAt(0)
const RUNES: string = [
    ...Array.from({length: CODE_Z_UPPER - CODE_A_UPPER + 1}, (_, i) => CODE_A_UPPER + i),
    ...Array.from({length: CODE_Z_LOWER - CODE_A_LOWER + 1}, (_, i) => CODE_A_LOWER + i),
    ...Array.from({length: CODE_9 - CODE_0 + 1}, (_, i) => CODE_0 + i),
    CODE_PLUS, CODE_SLASH
].map(code => String.fromCharCode(code)).join('')

export function generateToken(): string {
    return Array.from({length: 32}, () => {
        const index = Math.floor(Math.random() * RUNES.length)

        return RUNES[index]
    }).join('')
}
