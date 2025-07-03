import { ApplicationGroup } from './ApplicationGroup'

export function ApplicationGroupList(props) {
  return (
    <div class="container px-4 py-5" id="icon-grid">
      {Array.isArray(props.groups) && props.groups.map(group => (
        <ApplicationGroup key={group.name} group={group.name} applications={group.applications} />
      ))}
    </div>
  )
}

export default ApplicationGroupList;
