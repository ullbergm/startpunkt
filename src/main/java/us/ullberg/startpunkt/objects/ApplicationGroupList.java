package us.ullberg.startpunkt.objects;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;

@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationGroupList {
  private List<ApplicationGroup> groups;

  public ApplicationGroupList() {
    // default constructor for deserialization
  }

  public ApplicationGroupList(List<ApplicationGroup> groups) {
    this.groups = groups;
  }

  @JsonProperty("groups")
  public List<ApplicationGroup> getGroups() {
    return groups != null ? groups : List.of();
  }

  @JsonProperty("groups")
  public void setGroups(List<ApplicationGroup> groups) {
    this.groups = groups != null ? groups : List.of();
  }

  @Override
  public String toString() {
    return "ApplicationGroupList{groups=" + groups + '}';
  }
}
