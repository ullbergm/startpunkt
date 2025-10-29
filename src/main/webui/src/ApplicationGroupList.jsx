import { ApplicationGroup } from './ApplicationGroup'

export function ApplicationGroupList(props) {
  return (
    <div class="container px-4 py-5" id="icon-grid">
      {Array.isArray(props.groups) && props.groups.map(group => (
        <ApplicationGroup key={group.name} group={group.name} applications={group.applications} layoutPrefs={props.layoutPrefs} />
      ))}
    </div>
  )
}

export default ApplicationGroupList;
