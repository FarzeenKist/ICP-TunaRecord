import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type TunaRecord = Record<{
    id: string;
    vessel: string;
    location: string;
    holder: string;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type TunaPayload = Record<{
    vessel: string;
    location: string;
    holder: string;
}>

const tunaRecordStorage = new StableBTreeMap<string, TunaRecord>(0, 44, 1024);

$query;
export function queryTuna(id: string): Result<TunaRecord, string> {
    return match(tunaRecordStorage.get(id), {
        Some: (tunaRecord) => Result.Ok<TunaRecord, string>(tunaRecord),
        None: () => Result.Err<TunaRecord, string>(`A tuna record with id=${id} not found`)
    });
}

$query;
export function queryAllTuna(): Result<Vec<TunaRecord>, string> {
    return Result.Ok(tunaRecordStorage.values());
}

$query;
export function searchTunaByHolder(holder: string): Result<Vec<TunaRecord>, string> {
    const filteredTuna = tunaRecordStorage.values().filter((tuna) => tuna.holder === holder);
    return Result.Ok(filteredTuna);
}

$update;
export function deleteTunaRecord(id: string): Result<TunaRecord, string> {
    return match(tunaRecordStorage.remove(id), {
        Some: (deletedTuna) => Result.Ok<TunaRecord, string>(deletedTuna),
        None: () => Result.Err<TunaRecord, string>(`Couldn't delete a tuna record with id=${id}. Tuna record not found.`)
    });
}

$update;
export function recordTuna(payload: TunaPayload): Result<TunaRecord, string> {
    const tunaRecord: TunaRecord = { id: uuidv4(), createdAt: ic.time(), updatedAt: Opt.None, ...payload };
    tunaRecordStorage.insert(tunaRecord.id, tunaRecord);
    return Result.Ok(tunaRecord);
}

$update;
export function changeTunaHolder(id: string, holder: string): Result<TunaRecord, string> {
    return match(tunaRecordStorage.get(id), {
        Some: (tunaRecord) => {
            const updatedTuna: TunaRecord = {...tunaRecord, holder: holder, updatedAt: Opt.Some(ic.time())};
            tunaRecordStorage.insert(tunaRecord.id, updatedTuna);
            return Result.Ok<TunaRecord, string>(updatedTuna);
        },
        None: () => Result.Err<TunaRecord, string>(`Couldn't update a tuna record with id=${id}. Tuna record not found`)
    });
}

$query;
export function getTunaByCreationDate(): Result<Vec<TunaRecord>, string> {
    const sortedTuna = tunaRecordStorage.values().sort((a, b) => a.createdAt - b.createdAt);
    return Result.Ok(sortedTuna);
}

$query;
export function countTunaByVessel(): Result<Record<string, number>, string> {
    const vesselCount: Record<string, number> = {};
    const tunaRecords = tunaRecordStorage.values();

    for (const tuna of tunaRecords) {
        if (vesselCount[tuna.vessel]) {
            vesselCount[tuna.vessel]++;
        } else {
            vesselCount[tuna.vessel] = 1;
        }
    }

    return Result.Ok(vesselCount);
}

globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
}
