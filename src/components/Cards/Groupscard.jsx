import React from 'react';
import { Edit2, Server } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const GroupCard = ({ group }) => {
    // Status logic similar to HostCard? Group usually doesn't have status online/offline unless it aggregates?
    // Original code had status logic but unused 'status' prop in ListGroups?
    // I'll keep it safe.

    const statusColor =
        group.status === 'online'
            ? 'bg-emerald-500 hover:bg-emerald-600'
            : group.status === 'offline'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-amber-500 hover:bg-amber-600';

    return (
        <Card className="flex-1 max-h-24 min-w-[200px] transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden">
            <CardContent className="p-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="my-1">
                            {group.status && (
                                <Badge className={cn("mr-2", statusColor)} />
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <Server size={18} />
                            </Button>
                        </div>
                        <div className="mx-1 my-1">
                            <h3 className="font-bold text-sm leading-tight">{group.name}</h3>
                            {/* <span className="text-xs text-muted-foreground">{group.length} hosts</span> */}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground ml-auto">
                            <Edit2 size={16} />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default GroupCard;
