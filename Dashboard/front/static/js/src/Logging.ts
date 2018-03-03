const PRINT_CALLING_FUNC_STACK = false;

export default class Logging {
    log(msg: any): void {
        let s = this.constructor.name + ":: " + msg;

        if(PRINT_CALLING_FUNC_STACK) {
            s += "\n\t"
            s += this.getCallingCodeLine();
        }

        console.log(s)
    }

    getCallingCodeLine() {
        let s = (new Error().stack); 
        var s1 = s.substr(this.nthIndexOf(s, "\n", 3) + 1, s.length); 
        return s1.substring(0, s1.search("\n")).trim(); 
    }

    nthIndexOf(str, pattern, n) {
        var i = -1;
    
        while (n-- && i++ < str.length) {
            i = str.indexOf(pattern, i);
            if (i < 0) break;
        }
    
        return i;
    }
}