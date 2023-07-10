import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, nat8, Principal, $init } from 'azle';
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


let adminAccount : Principal;
let memberCount : nat8;
const trustedMembers = new StableBTreeMap<nat8,Principal>(1,44,1024);


const tunaRecordStorage = new StableBTreeMap<string, TunaRecord>(0, 44, 1024);


$init;
export function init(admin : string) : void{
    adminAccount= Principal.fromText(admin)
}


// Function that allows the admin to add members to the platform
$update;
export function addMember(member : string) : Result<nat8,string>{
    const caller = ic.caller();
    // return an error if caller isn't the admin
    if(caller.toString() !== adminAccount.toString()){
        return Result.Err<nat8,string>("Only the admin can add trusted members")
    }
    memberCount= (memberCount+1)
    trustedMembers.insert(memberCount,Principal.fromText(member))
    return Result.Ok<nat8,string>(memberCount);
}

// Function that allows the admin to remove members from the platform
$update;
export function deleteMember(id: nat8) : Result<string,string>{
    const caller = ic.caller();
    // return an error if caller isn't the admin
    if(caller.toString() !== adminAccount.toString()){
        return Result.Err<string,string>("Only the admin can delete trusted members")
    }

    return match(trustedMembers.remove(id),{
        None:()=> Result.Err<string,string>(`Member with id=${id} cannot be found`),
        Some:(deletedMember)=> Result.Ok<string,string>("Member deleted successfully")
    });
}

// Function that returns a boolean value about whether a user is a member of the platform
$query;
export function isMember(id : Principal) : boolean{
    return trustedMembers.values().includes(id)
}

// Function that returns all members of the platform
$query;
export function getAllTrustedMembers() : Vec<Principal>{
    return Array.from(trustedMembers.values());
}

// Function that returns a specific TunaRecord with id
$query;
export function queryTuna(id: string): Result<TunaRecord, string> {
    return match(tunaRecordStorage.get(id), {
        Some: (tunaRecord) => Result.Ok<TunaRecord, string>(tunaRecord),
        None: () => Result.Err<TunaRecord, string>(`A tuna record with id=${id} not found`)
    });
}
// Function that returns an array of all TunaRecords
$query;
export function queryAllTuna(): Result<Vec<TunaRecord>, string> {
    return Result.Ok(tunaRecordStorage.values());
}

// Function that returns an array of all TunaRecords of a specific holder
$query;
export function searchTunaByHolder(holder: string): Result<Vec<TunaRecord>, string> {
    if(tunaRecordStorage.isEmpty()){
        return Result.Err<Vec<TunaRecord>, string>("There are currently no tuna records");
    }
    const filteredTuna = tunaRecordStorage.values().filter((tuna) => tuna.holder === holder);
    return Result.Ok(filteredTuna);
}

// Function that allows the admin or members of the platform to delete a TunaRecord from the state
$update;
export function deleteTunaRecord(id: string): Result<TunaRecord, string> {
const caller = ic.caller();
// Delete the TunaRecord only if caller is the admin or a member of the platform
if(caller.toString() === adminAccount.toString() || isMember(caller)){

    return match(tunaRecordStorage.remove(id), {
        Some: (deletedTuna) => Result.Ok<TunaRecord, string>(deletedTuna),
        None: () => Result.Err<TunaRecord, string>(`Couldn't delete a tuna record with id=${id}. Tuna record not found.`)
    });
}
return Result.Err<TunaRecord,string>("You are not authorized")
}

// Function that allows the admin or members of the platform to add  and save a TunaRecord to the state
$update;
export function recordTuna(payload: TunaPayload): Result<TunaRecord, string> {

    const caller = ic.caller();
    // add the TunaRecord only if caller is the admin or a member of the platform
    if(caller.toString() === adminAccount.toString() || isMember(caller)){
    const tunaRecord: TunaRecord = { id: uuidv4(), createdAt: ic.time(), updatedAt: Opt.None, ...payload };
    tunaRecordStorage.insert(tunaRecord.id, tunaRecord);
    return Result.Ok(tunaRecord);
    }
    return Result.Err<TunaRecord,string>("You are not authorized")
}

// Function that allows the admin or members of the platform to change the holder of a specific TunaRecord
$update;
export function changeTunaHolder(id: string, holder: string): Result<TunaRecord, string> {
    const caller = ic.caller();
    // change the holder of the TunaRecord only if caller is the admin or a member of the platform
    if(caller.toString() === adminAccount.toString() || isMember(caller)){
    return match(tunaRecordStorage.get(id), {
        Some: (tunaRecord) => {
            const updatedTuna: TunaRecord = {...tunaRecord, holder: holder, updatedAt: Opt.Some(ic.time())};
            tunaRecordStorage.insert(tunaRecord.id, updatedTuna);
            return Result.Ok<TunaRecord, string>(updatedTuna);
        },
        None: () => Result.Err<TunaRecord, string>(`Couldn't update a tuna record with id=${id}. Tuna record not found`)
    });
}
return Result.Err<TunaRecord,string>("You are not authorized")
}

// Function that returns a sorted by date array of TunaRecords
$query;
export function getTunaByCreationDate(): Result<Vec<TunaRecord>, string> {
    if(tunaRecordStorage.isEmpty()){
        return Result.Err<Vec<TunaRecord>, string>("There are currently no tuna records");
    }
    const sortedTuna = tunaRecordStorage.values().sort((a, b) => Number(a.createdAt - b.createdAt));
    return Result.Ok(sortedTuna);
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
