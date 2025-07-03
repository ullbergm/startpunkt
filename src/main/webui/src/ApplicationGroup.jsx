import { Application } from './Application';

export function ApplicationGroup(props) {
  return (
    <div>
      <h2 class="pb-2 border-bottom text-uppercase">{props.group}</h2>

      <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 py-5">
        {Array.isArray(props.applications) && props.applications.map((app) => (
          <Application key={app.name} app={app} />
        ))}
      </div>
    </div>
  );
}

export default ApplicationGroup;