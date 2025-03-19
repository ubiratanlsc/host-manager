import { use, useContext, useEffect } from "react";
import FileContext from "../../context/FileContext";
import { HostIcon } from "../Icons/Icons";

const Grid = () => {
    const { file } = useContext(FileContext);
    // console.log('file', file);
    useEffect(() => {
        console.log(file);
        // console.log(file.group[0]['name']);
    }, [file]);
    let groups = [0, 1, 2, 3];
    console.log(groups);

    return (
        <div className="grid gap-y-1.5">
            {groups.map((group, index) => (
                <div key={index} className="flex max-w-[396px] h-[37px] bg-windows-component rounded-md pl-5 mx-3 items-center gap-x-3">
                    <HostIcon className="size-8" />
                    <div className="font-SegoeUI">BRB</div>
                </div>
            ))}

        </div>
    );
}

export default Grid;