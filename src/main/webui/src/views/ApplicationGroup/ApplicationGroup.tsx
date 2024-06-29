import Application from '../Application/Application';
import ApplicationGroupProps from './ApplicationGroupProps';

function ApplicationGroup({ name, applications }: ApplicationGroupProps) {
    return (
        <div className="col-md-4">
            <div className="pb-2 h5">
                {name}
            </div>
            <div className="row">

                <div className="list-group">
                    {applications.map((application) => (
                        <Application name={application.name} url={application.url} info={application.info} icon={application.icon} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ApplicationGroup;

