package us.ullberg.startpunkt.objects;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationGroupList {
  private List<ApplicationGroup> list;

  public ApplicationGroupList(List<ApplicationGroup> list) {
    this.list = list;
  }

  @JsonProperty("groups")
  public List<ApplicationGroup> groups() {
    return list;
  }
}
