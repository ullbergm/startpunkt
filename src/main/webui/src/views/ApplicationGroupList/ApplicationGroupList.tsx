import ApplicationGroup from "../ApplicationGroup/ApplicationGroup";
import ApplicationGroupListProps from "./ApplicationGroupListProps";

function ApplicationGroupList({ groups }: ApplicationGroupListProps) {
    return (
        <div className="container text-bg-dark">
            <div className="row mb-2">
                {groups.map((group) => (
                    <ApplicationGroup name={group.name} applications={group.applications} />
                ))}
            </div>
        </div>
    );
}

export default ApplicationGroupList;