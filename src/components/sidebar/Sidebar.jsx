import { Connect, Folder, HostIcon, Shell } from "../Icons/Icons";



const Sidebar = () => {
    return (
        <div className="max-w-60 min-w-60 h-[98vh] ml-2.5 font-bold bg-white/5 backdrop-blur-lg shadow-lg rounded-sm">
            <h1 className="font-Tim text-neutral-400 text-lg ml-5">Host Manager</h1>
            {/* <div className="h-52"></div> */}
            <div className="ml-5">
                <spam className="font-Tim text-neutral-400 text-xs ">Hosts</spam>
                <div className="mt-2.5">
                    <div className="flex items-center gap-x-2.5">
                        <Folder className="size-4" />
                        <span className="text-xs">BRB</span>
                    </div>
                    <div className="ml-2.5 max-w-64 border-l-[0.01px] border-gray-500">
                        <div className=" flex justify-between items-center gap-x-1 ml-1.5 mt-1.5">
                            <div className="flex gap-x-1 items-center">
                                <Shell className="size-5" />
                                <span className="text-xs">URA 00</span>
                            </div>
                            <Connect />
                        </div>

                        <div className=" flex justify-between items-center gap-x-1 ml-1.5 mt-1.5">
                            <div className="flex gap-x-1 items-center">
                                <Shell className="size-5" />
                                <span className="text-xs">URA 01</span>
                            </div>
                            <Connect status="online" />
                        </div>

                        <div className=" flex justify-between items-center gap-x-1 ml-1.5 mt-1.5">
                            <div className="flex gap-x-1 items-center">
                                <Shell className="size-5" />
                                <span className="text-xs">URA 02</span>
                            </div>
                            <Connect status="online" />
                        </div>

                        <div className=" flex justify-between items-center gap-x-1 ml-1.5 mt-1.5">
                            <div className="flex gap-x-1 items-center">
                                <Shell className="size-5" />
                                <span className="text-xs">URA 03</span>
                            </div>
                            <Connect />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;