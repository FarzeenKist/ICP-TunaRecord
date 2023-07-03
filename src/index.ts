import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt } from 'azle';
import { v4 as uuidv4 } from 'uuid';

/**
 * This type represents a tuna record that can be listed on a ledger.
 */

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

// https://github.com/hyperledger-archives/education/blob/master/LFS171x/fabric-material/chaincode/tuna-app/tuna-chaincode.go#L81

$query;
export function queryTuna(id: string): Result<TunaRecord, string> {
    return match(tunaRecordStorage.get(id), {
        Some: (tunaRecord) => Result.Ok<TunaRecord, string>(tunaRecord),
        None: () => Result.Err<TunaRecord, string>(`a tuna record with id=${id} not found`)
    });
}

$query;
export function queryAllTuna(): Result<Vec<TunaRecord>, string> {
    return Result.Ok(tunaRecordStorage.values());
}

$update;
export function deleteTunaRecord(id: string): Result<TunaRecord, string> {
    return match(tunaRecordStorage.remove(id), {
        Some: (deletedTuna) => Result.Ok<TunaRecord, string>(deletedTuna),
        None: () => Result.Err<TunaRecord, string>(`couldn't delete a tuna record with id=${id}. tuna record not found.`)
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
        None: () => Result.Err<TunaRecord, string>(`couldn't update a tuna record with id=${id}. tuna record not found`)
    });
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32)

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256)
        }

        return array
    }
}