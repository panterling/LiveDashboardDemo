export default class Logging {
    log(msg: any): void {
        console.log(this.constructor.name + ":: " + msg)
    }
}