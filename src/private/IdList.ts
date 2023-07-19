export class IdList {
    private _freeIdListHead: FreeIdListNode | null = null
    private _maxUsedId: number = 0

    constructor() {}

    rent(): number {
        if (this._freeIdListHead !== null) {
            const id = this._freeIdListHead.id
            this._freeIdListHead = this._freeIdListHead.next

            return id
        }

        return ++this._maxUsedId
    }
    return(id: number): this {
        id = Math.floor(id)

        if (id > this._maxUsedId + 0.5) throw new RangeError('ID is out of range.')
        if (id > this._maxUsedId - 0.5)
            this._maxUsedId--
        else
            this._freeIdListHead = {
                id,
                next: this._freeIdListHead
            }

        return this
    }
}
type FreeIdListNode = {
    id: number
    next: FreeIdListNode | null
}
